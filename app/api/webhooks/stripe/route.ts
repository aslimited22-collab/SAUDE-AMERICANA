import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { BillingAgent } from "@/lib/agents/billing-agent";

// ─── Helpers ────────────────────────────────────────────────────────────────
async function findLeadIdByStripeCustomer(customerId: string): Promise<string | null> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("leads")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return (data?.id as string) ?? null;
}

async function findLeadIdBySubscription(subscriptionId: string): Promise<string | null> {
  const supabase = getServiceSupabase();
  const { data } = await supabase
    .from("subscriptions")
    .select("lead_id")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  return (data?.lead_id as string) ?? null;
}

// ─── Event handlers ─────────────────────────────────────────────────────────
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const email = session.customer_email;
  const plan = session.metadata?.plan;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!email) return;

  const supabase = getServiceSupabase();

  // Update lead record
  const { data: lead } = await supabase
    .from("leads")
    .update({
      converted: true,
      stripe_customer_id: customerId,
      plan,
      subscription_id: subscriptionId,
      subscription_status: "active",
    })
    .eq("email", email)
    .select("id, first_name")
    .single();

  // Bootstrap subscriptions row + sync via BillingAgent
  if (lead && subscriptionId) {
    await BillingAgent.syncSubscription(lead.id as string, subscriptionId);

    // Schedule followups for the next 9 months (best-effort)
    try {
      const { FollowupAgent } = await import("@/lib/agents/followup-agent");
      await FollowupAgent.schedulePatientFollowups({
        leadId: lead.id as string,
      }).catch(() => undefined);
    } catch {
      // Agent is best-effort — don't block webhook ack
    }
  }

  // Send confirmation email
  try {
    const resend = getResend();
    await resend.emails.send({
      from: "SlimRx <noreply@slimrx.com>",
      to: email,
      subject: "Welcome to SlimRx! Your subscription is active.",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0A1628;">Welcome to SlimRx!</h1>
          <p>Your subscription is now active. Here's what happens next:</p>
          <ol>
            <li><strong>Complete your medical intake</strong> — required before a provider can review your case.</li>
            <li><strong>Provider review</strong> — a licensed physician reviews your information within 24–48 hours.</li>
            <li><strong>Prescription &amp; shipping</strong> — once approved, your medication ships directly to you.</li>
          </ol>
          <a href="${process.env.NEXT_PUBLIC_SITE_URL}/medical-intake" style="display: inline-block; background: #00D4B4; color: #0A1628; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">Complete Medical Intake</a>
          <p style="margin-top: 24px; color: #6B7280; font-size: 14px;">— The SlimRx Team</p>
        </div>
      `,
    });
  } catch (emailError) {
    console.error("Confirmation email error:", emailError);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }).subscription === "string"
      ? ((invoice as Stripe.Invoice & { subscription?: string }).subscription as string)
      : (invoice as Stripe.Invoice & { subscription?: Stripe.Subscription }).subscription?.id;
  if (!subscriptionId) return;

  const leadId = await findLeadIdBySubscription(subscriptionId);
  if (!leadId) return;

  const attemptCount = (invoice.attempt_count ?? 0) || 1;
  await BillingAgent.handlePaymentFailure(leadId, subscriptionId, attemptCount);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId =
    typeof (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription }).subscription === "string"
      ? ((invoice as Stripe.Invoice & { subscription?: string }).subscription as string)
      : (invoice as Stripe.Invoice & { subscription?: Stripe.Subscription }).subscription?.id;
  if (!subscriptionId) return;

  const leadId = await findLeadIdBySubscription(subscriptionId);
  if (!leadId) return;

  const supabase = getServiceSupabase();
  await supabase
    .from("subscriptions")
    .update({
      last_payment_at: new Date().toISOString(),
      last_payment_amount: invoice.amount_paid ?? 0,
      retry_count: 0,
    })
    .eq("stripe_subscription_id", subscriptionId);

  await BillingAgent.syncSubscription(leadId, subscriptionId);
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const leadId =
    (await findLeadIdBySubscription(sub.id)) ||
    (typeof sub.customer === "string"
      ? await findLeadIdByStripeCustomer(sub.customer)
      : null);

  if (!leadId) return;
  await BillingAgent.syncSubscription(leadId, sub.id);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const leadId = await findLeadIdBySubscription(sub.id);
  if (!leadId) return;

  const supabase = getServiceSupabase();
  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.id);

  await supabase
    .from("leads")
    .update({ subscription_status: "canceled" })
    .eq("id", leadId);

  // Retention message (AI-generated, via billing agent)
  await BillingAgent.generateRetentionMessage(leadId).catch(() => undefined);
}

// ─── Webhook entry ───────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_succeeded":
      case "invoice.paid":
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.updated":
      case "customer.subscription.created":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`[Stripe] Unhandled event: ${event.type}`);
    }
  } catch (err) {
    console.error(`[Stripe] Handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
