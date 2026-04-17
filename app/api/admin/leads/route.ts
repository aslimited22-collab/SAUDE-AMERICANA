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
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error("Admin leads error:", err);
    return NextResponse.json([]);
  }
}
