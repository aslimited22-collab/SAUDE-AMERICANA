import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { requirePatientAuth } from "@/lib/auth";

// GET /api/patient/subscription
// Returns the authenticated patient's current subscription summary.
export async function GET(request: Request) {
  const auth = await requirePatientAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getServiceSupabase();

  const { data: lead } = await supabase
    .from("leads")
    .select("plan, subscription_status, current_month")
    .eq("id", auth.leadId)
    .maybeSingle();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("last_payment_at, current_period_end, status, plan")
    .eq("lead_id", auth.leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lead?.plan && !sub) {
    return NextResponse.json(
      { error: "No subscription found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    plan: lead?.plan ?? sub?.plan ?? null,
    status: sub?.status ?? lead?.subscription_status ?? null,
    currentMonth: lead?.current_month ?? null,
    lastPaymentAt: sub?.last_payment_at ?? null,
    nextRenewal: sub?.current_period_end ?? null,
  });
}
