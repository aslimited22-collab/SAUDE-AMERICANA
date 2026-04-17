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
    const { data, error } = await supabase
      .from("medical_intakes")
      .select("*, leads(first_name, email, plan)")
      .order("submitted_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Admin intakes error:", err);
    return NextResponse.json([]);
  }
}
