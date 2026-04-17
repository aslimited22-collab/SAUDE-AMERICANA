import { z } from "zod";
import { BaseAgent, type AgentResult } from "./base-agent";
import { getAnthropic, CLAUDE_HAIKU } from "@/lib/anthropic";
import { getStripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { getTwilio, getSmsNumber } from "@/lib/twilio";

// ─── Input Schemas ────────────────────────────────────────────────────────────
export const BillingActionSchema = z.object({
  action: z.enum([
    "sync_subscription",
    "handle_payment_failure",
    "handle_cancellation",
    "pause_subscription",
    "resume_subscription",
    "generate_retention_message",
    "process_refund",
  ]),
  leadId: z.string().uuid(),
  subscriptionId: z.string().optional(),
  stripeEventData: z.record(z.string(), z.unknown()).optional(),
  cancellationReason: z.string().optional(),
});

export type BillingAction = z.infer<typeof BillingActionSchema>;

// ─── Plan Prices ──────────────────────────────────────────────────────────────
const PLAN_PRICES = { starter: 197_00, popular: 297_00, premium: 397_00 } as const;

// ─── Billing Agent ────────────────────────────────────────────────────────────
class BillingAgentClass extends BaseAgent {
  constructor() {
    super("billing", "BillingAgent");
  }

  // Sync Stripe subscription status to DB
  async syncSubscription(leadId: string, stripeSubscriptionId: string): Promise<AgentResult<void>> {
    const taskId = await this.createTask("sync_subscription", { leadId, stripeSubscriptionId }, {
      leadId,
      priority: 4,
    });

    return this.safeExecute(
      async () => {
        const stripe = getStripe();
        const supabase = getServiceSupabase();

        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);

        const statusMap: Record<string, string> = {
          active: "active",
          past_due: "past_due",
          canceled: "canceled",
          unpaid: "past_due",
          paused: "paused",
          incomplete: "incomplete",
          trialing: "active",
          incomplete_expired: "canceled",
        };

        // In Stripe API 2025-xx, current_period_{start,end} live on each
        // subscription item, not on the subscription itself. Use the first
        // item — SlimRx subscriptions only have a single plan item.
        const firstItem = sub.items.data[0];
        const periodStart = firstItem?.current_period_start;
        const periodEnd = firstItem?.current_period_end;

        await supabase
          .from("subscriptions")
          .upsert(
            {
              lead_id: leadId,
              stripe_subscription_id: stripeSubscriptionId,
              stripe_customer_id:
                typeof sub.customer === "string" ? sub.customer : sub.customer.id,
              status: statusMap[sub.status] ?? sub.status,
              current_period_start: periodStart
                ? new Date(periodStart * 1000).toISOString()
                : null,
              current_period_end: periodEnd
                ? new Date(periodEnd * 1000).toISOString()
                : null,
              cancel_at: sub.cancel_at
                ? new Date(sub.cancel_at * 1000).toISOString()
                : null,
              canceled_at: sub.canceled_at
                ? new Date(sub.canceled_at * 1000).toISOString()
                : null,
            },
            { onConflict: "stripe_subscription_id" }
          );

        // Sync to leads table
        await supabase
          .from("leads")
          .update({ subscription_status: statusMap[sub.status] ?? sub.status })
          .eq("id", leadId);
      },
      {
        action: "sync_subscription",
        resource_type: "subscription",
        resource_id: stripeSubscriptionId,
        phi_accessed: false,
        patient_id: leadId,
        taskId,
      }
    );
  }

  // Handle payment failure with automatic retry logic
  async handlePaymentFailure(
    leadId: string,
    subscriptionId: string,
    attemptCount: number
  ): Promise<AgentResult<{ action: string; message: string }>> {
    const taskId = await this.createTask("handle_payment_failure", {
      leadId,
      subscriptionId,
      attemptCount,
    }, { leadId, priority: 2 });

    return this.safeExecute(
      async () => {
        const supabase = getServiceSupabase();
        const stripe = getStripe();

        const { data: lead } = await supabase
          .from("leads")
          .select("first_name, email, plan")
          .eq("id", leadId)
          .single();
        if (!lead) throw new Error("Lead not found");

        let action = "";
        let message = "";

        if (attemptCount === 1) {
          // First failure: send gentle reminder
          message = `Hi ${lead.first_name as string}, your SlimRx payment of $${
            PLAN_PRICES[(lead.plan as keyof typeof PLAN_PRICES) ?? "popular"] / 100
          } couldn't be processed. Please update your payment method to continue your GLP-1 program: ${
            process.env.NEXT_PUBLIC_SITE_URL
          }/billing`;
          action = "reminder_sent";

          await this.sendSmsIfAvailable(leadId, message);
          await this.sendPaymentFailureEmail(
            lead.email as string,
            lead.first_name as string,
            1
          );
        } else if (attemptCount === 2) {
          // Second failure: stronger message + retry
          message = `URGENT: Your SlimRx subscription is about to be paused. Update payment here: ${
            process.env.NEXT_PUBLIC_SITE_URL
          }/billing — Reply HELP for assistance.`;
          action = "urgent_reminder_sent";

          await this.sendSmsIfAvailable(leadId, message);
          await this.sendPaymentFailureEmail(
            lead.email as string,
            lead.first_name as string,
            2
          );
        } else {
          // Third+ failure: pause shipment
          await stripe.subscriptions.update(subscriptionId, {
            pause_collection: { behavior: "void" },
          });

          await supabase
            .from("subscriptions")
            .update({ status: "paused", pause_start: new Date().toISOString() })
            .eq("stripe_subscription_id", subscriptionId);

          await supabase
            .from("leads")
            .update({ subscription_status: "paused" })
            .eq("id", leadId);

          action = "subscription_paused";
          message = "Subscription paused due to repeated payment failure";

          await this.sendPaymentFailureEmail(
            lead.email as string,
            lead.first_name as string,
            3
          );
        }

        // Update retry count
        await supabase
          .from("subscriptions")
          .update({ retry_count: attemptCount })
          .eq("stripe_subscription_id", subscriptionId);

        return { action, message };
      },
      {
        action: "handle_payment_failure",
        resource_type: "subscription",
        resource_id: subscriptionId,
        phi_accessed: false,
        patient_id: leadId,
        taskId,
      }
    );
  }

  // Generate personalized retention message when patient cancels
  async generateRetentionMessage(
    leadId: string,
    cancellationReason?: string
  ): Promise<AgentResult<{ message: string; sent: boolean }>> {
    const taskId = await this.createTask("generate_retention_message", { leadId }, {
      leadId,
      priority: 2,
    });

    return this.safeExecute(
      async () => {
        const supabase = getServiceSupabase();
        const { data: lead } = await supabase
          .from("leads")
          .select("first_name, email, plan, current_month, quiz_answers")
          .eq("id", leadId)
          .single();
        if (!lead) throw new Error("Lead not found");

        const anthropic = getAnthropic();
        const message = await this.withRetry(
          () =>
            anthropic.messages.create({
              model: CLAUDE_HAIKU, // Fast/cheap for personalized copy
              max_tokens: 300,
              system: `You write empathetic, personalized retention messages for a GLP-1 weight loss telehealth program.
Messages should be warm, non-pushy, acknowledge the patient's journey, and offer a concrete reason to stay.
Keep under 160 characters for SMS. Return ONLY the message text.`,
              messages: [
                {
                  role: "user",
                  content: `Write a retention SMS for a patient who is canceling.

Patient: ${lead.first_name}
Plan: ${lead.plan}
Treatment month: ${lead.current_month} of 9
Cancellation reason: ${cancellationReason ?? "not provided"}
Quiz data: ${JSON.stringify(lead.quiz_answers)}

Write one SMS message (max 160 chars) that addresses their specific reason and offers a solution (pause option, discount, support call).`,
                },
              ],
            }),
          {},
          taskId
        );

        const smsText =
          message.content[0].type === "text"
            ? message.content[0].text.trim()
            : "";

        // Send retention SMS
        let sent = false;
        try {
          sent = await this.sendSmsIfAvailable(leadId, smsText);
        } catch {
          // Don't fail if SMS fails — still record the message
        }

        // Update subscription
        await supabase
          .from("subscriptions")
          .update({
            retention_message_sent: true,
            cancellation_reason: cancellationReason,
          })
          .eq("lead_id", leadId);

        return { message: smsText, sent };
      },
      {
        action: "generate_retention_message",
        resource_type: "lead",
        resource_id: leadId,
        phi_accessed: false,
        patient_id: leadId,
        taskId,
      }
    );
  }

  // Pause subscription (e.g., patient traveling, financial hardship)
  async pauseSubscription(leadId: string, subscriptionId: string): Promise<AgentResult<void>> {
    const taskId = await this.createTask("pause_subscription", { leadId }, {
      leadId,
      priority: 3,
    });

    return this.safeExecute(
      async () => {
        const stripe = getStripe();
        const supabase = getServiceSupabase();

        // Pause billing — medication shipment also pauses
        await stripe.subscriptions.update(subscriptionId, {
          pause_collection: { behavior: "void" },
        });

        const pauseStart = new Date();
        const pauseEnd = new Date(pauseStart);
        pauseEnd.setDate(pauseEnd.getDate() + 30); // Default 30-day pause

        await supabase
          .from("subscriptions")
          .update({
            status: "paused",
            pause_start: pauseStart.toISOString(),
            pause_end: pauseEnd.toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId);

        await supabase
          .from("leads")
          .update({ subscription_status: "paused" })
          .eq("id", leadId);

        const { data: lead } = await supabase
          .from("leads")
          .select("first_name, email")
          .eq("id", leadId)
          .single();

        if (lead) {
          await this.sendSmsIfAvailable(
            leadId,
            `Hi ${lead.first_name as string}, your SlimRx subscription has been paused for 30 days. We'll send you a reminder before it resumes. Reply RESUME to restart early.`
          );
        }
      },
      {
        action: "pause_subscription",
        resource_type: "subscription",
        resource_id: subscriptionId,
        phi_accessed: false,
        patient_id: leadId,
        taskId,
      }
    );
  }

  // Resume a paused subscription
  async resumeSubscription(leadId: string, subscriptionId: string): Promise<AgentResult<void>> {
    const taskId = await this.createTask("resume_subscription", { leadId }, {
      leadId,
      priority: 3,
    });

    return this.safeExecute(
      async () => {
        const stripe = getStripe();
        const supabase = getServiceSupabase();

        await stripe.subscriptions.update(subscriptionId, {
          pause_collection: "",
        } as Parameters<typeof stripe.subscriptions.update>[1]);

        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            pause_start: null,
            pause_end: null,
          })
          .eq("stripe_subscription_id", subscriptionId);

        await supabase
          .from("leads")
          .update({ subscription_status: "active" })
          .eq("id", leadId);
      },
      {
        action: "resume_subscription",
        resource_type: "subscription",
        resource_id: subscriptionId,
        phi_accessed: false,
        patient_id: leadId,
        taskId,
      }
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async sendSmsIfAvailable(leadId: string, message: string): Promise<boolean> {
    const supabase = getServiceSupabase();
    const { data: lead } = await supabase
      .from("leads")
      .select("phone")
      .eq("id", leadId)
      .single();

    if (!lead?.phone) return false;

    try {
      const twilio = getTwilio();
      const msg = await twilio.messages.create({
        to: lead.phone as string,
        from: getSmsNumber(),
        body: message,
      });

      // Log message to DB
      await supabase.from("patient_messages").insert({
        lead_id: leadId,
        direction: "outbound",
        channel: "sms",
        from_number: getSmsNumber(),
        to_number: lead.phone as string,
        body: message,
        twilio_sid: msg.sid,
        status: "sent",
        agent_id: this.agentName,
      });

      return true;
    } catch {
      return false;
    }
  }

  private async sendPaymentFailureEmail(
    email: string,
    firstName: string,
    attempt: number
  ): Promise<void> {
    const resend = getResend();
    const urgency = attempt >= 3 ? "⚠️ URGENT: " : attempt === 2 ? "⚠️ " : "";
    const subjects = [
      `${urgency}Action needed — update your payment method`,
      `${urgency}Your SlimRx medication shipment may be paused`,
      `${urgency}Your SlimRx subscription has been paused`,
    ];

    await resend.emails.send({
      from: "SlimRx Billing <billing@slimrx.com>",
      to: email,
      subject: subjects[attempt - 1] ?? subjects[0],
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0A1628;">Hi ${firstName},</h2>
          ${attempt < 3 ? `
            <p>We weren't able to process your payment. Please update your payment method to keep your medication on track.</p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/billing" style="display:inline-block;background:#00D4B4;color:#0A1628;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Update Payment Method</a>
          ` : `
            <p>Your subscription has been paused due to payment issues. Your medication shipments are on hold.</p>
            <p>To resume your GLP-1 program and avoid losing your treatment progress, please update your payment method.</p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/billing" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Resume My Subscription</a>
          `}
          <p style="color:#6b7280;font-size:14px;margin-top:24px;">Need help? Reply to this email or text ${process.env.SUPPORT_SMS_NUMBER ?? "(800) 555-0100"}</p>
        </div>
      `,
    });
  }
}

export const BillingAgent = new BillingAgentClass();
