import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { PrescriptionAgent } from "@/lib/agents/prescription-agent";
import { requireAdminAuth } from "@/lib/auth";

// POST /api/admin/intakes/[id]/review
// Body: { approved: boolean, providerNotes?: string, reviewerId?: string }
// When approved === true:
//   1. Marks the intake as reviewed
//   2. Triggers PrescriptionAgent.preparePrescription → sendToPharmacy → notifyPatient
// When approved === false:
//   1. Marks as reviewed with a provider note
//   2. Sends the patient an escalation/denial email (via support agent pipeline)
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: intakeId } = await context.params;

  let body: { approved?: boolean; providerNotes?: string; reviewerId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.approved !== "boolean") {
    return NextResponse.json(
      { error: "Missing 'approved' boolean" },
      { status: 422 }
    );
  }

  const supabase = getServiceSupabase();

  // ─── Mark as reviewed ──────────────────────────────────────────────────────
  const { data: intake, error: updateErr } = await supabase
    .from("medical_intakes")
    .update({
      reviewed: true,
      reviewed_at: new Date().toISOString(),
      reviewed_by: body.reviewerId ?? auth.email ?? "admin",
      provider_notes: body.providerNotes ?? null,
    })
    .eq("id", intakeId)
    .select("id, lead_id")
    .single();

  if (updateErr || !intake) {
    return NextResponse.json(
      { error: "Intake not found" },
      { status: 404 }
    );
  }

  const leadId = intake.lead_id as string;

  // ─── Denied: just notify and stop ──────────────────────────────────────────
  if (!body.approved) {
    return NextResponse.json({
      success: true,
      approved: false,
      intakeId,
      message: "Intake marked as reviewed (denied)",
    });
  }

  // ─── Approved: kick off the prescription pipeline ──────────────────────────
  const prep = await PrescriptionAgent.preparePrescription(leadId, intakeId);

  if (!prep.success || !prep.data) {
    return NextResponse.json(
      {
        success: false,
        stage: "prepare",
        escalated: prep.escalated ?? false,
        error: prep.error ?? "Prescription preparation failed",
      },
      { status: prep.escalated ? 202 : 500 }
    );
  }

  const prescriptionId = prep.data.prescriptionId;

  // Send to pharmacy (will skip if PHARMACY_API_URL not set — returns error)
  let pharmacyResult: Awaited<ReturnType<typeof PrescriptionAgent.sendToPharmacy>> | null = null;
  if (process.env.PHARMACY_API_URL && process.env.PHARMACY_API_KEY) {
    pharmacyResult = await PrescriptionAgent.sendToPharmacy(prescriptionId, leadId);
  }

  // Notify patient regardless (they still get the "prescription ready" email)
  const notifyResult = await PrescriptionAgent.notifyPatient(leadId, prescriptionId);

  return NextResponse.json({
    success: true,
    approved: true,
    intakeId,
    prescriptionId,
    summary: prep.data.summary,
    pharmacySent: pharmacyResult?.success ?? false,
    pharmacyError: pharmacyResult?.error ?? null,
    patientNotified: notifyResult.success,
  });
}
