import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { requirePatientAuth } from "@/lib/auth";

// GET /api/patient/me
// Returns the authenticated patient's full dashboard snapshot.
export async function GET(request: Request) {
  const auth = await requirePatientAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const supabase = getServiceSupabase();

  const { data: lead } = await supabase
    .from("leads")
    .select(
      "id, first_name, email, plan, subscription_status, current_month"
    )
    .eq("id", auth.leadId)
    .maybeSingle();

  if (!lead) {
    return NextResponse.json({ error: "No patient record" }, { status: 404 });
  }

  const { data: intake } = await supabase
    .from("medical_intakes")
    .select("id, reviewed, prescription_sent")
    .eq("lead_id", auth.leadId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: rx } = await supabase
    .from("prescriptions")
    .select("shipped, tracking_number, delivered")
    .eq("lead_id", auth.leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("current_period_end")
    .eq("lead_id", auth.leadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    firstName: lead.first_name ?? "there",
    email: lead.email,
    plan: lead.plan ?? null,
    subscriptionStatus: lead.subscription_status ?? null,
    currentMonth: lead.current_month ?? null,
    hasIntake: !!intake,
    intakeReviewed: !!intake?.reviewed,
    prescriptionSent: !!intake?.prescription_sent,
    prescriptionShipped: !!rx?.shipped,
    trackingNumber: (rx?.tracking_number as string | null) ?? null,
    nextRenewal: sub?.current_period_end ?? null,
  });
}
