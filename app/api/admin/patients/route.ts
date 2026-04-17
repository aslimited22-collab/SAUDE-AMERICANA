import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { requireAdminAuth } from "@/lib/auth";

export async function GET(request: Request) {
  const auth = await requireAdminAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = getServiceSupabase();
    const { data: patients, error } = await supabase
      .from("leads")
      .select("*")
      .eq("converted", true)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    // Check which patients have submitted intakes
    const patientIds = (patients || []).map((p) => p.id);
    const { data: intakes } = await supabase
      .from("medical_intakes")
      .select("lead_id")
      .in("lead_id", patientIds);

    const intakeLeadIds = new Set((intakes || []).map((i) => i.lead_id));

    const result = (patients || []).map((p) => ({
      ...p,
      has_intake: intakeLeadIds.has(p.id),
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("Admin patients error:", err);
    return NextResponse.json([]);
  }
}
