import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { requirePatientAuth } from "@/lib/auth";

// POST /api/billing/portal
// Returns a Stripe Customer Portal URL for the authenticated patient.
// The patient manages payment method, cancels, pauses, views invoices there.
export async function POST(request: Request) {
  const auth = await requirePatientAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getServiceSupabase();
  const { data: lead } = await supabase
    .from("leads")
    .select("stripe_customer_id")
    .eq("id", auth.leadId)
    .maybeSingle();

  if (!lead?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found. Please complete checkout first." },
      { status: 404 }
    );
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: lead.stripe_customer_id as string,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/billing`,
  });

  return NextResponse.json({ url: session.url });
}
