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

    const [leadsRes, convertedRes, intakesRes, activeSubsRes] = await Promise.all([
      supabase.from("leads").select("id", { count: "exact", head: true }),
      supabase.from("leads").select("id, plan", { count: "exact" }).eq("converted", true),
      supabase.from("medical_intakes").select("id", { count: "exact", head: true }),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ]);

    const totalLeads = leadsRes.count || 0;
    const conversions = convertedRes.count || 0;
    const pendingIntakes = intakesRes.count || 0;
    const activeSubscribers = activeSubsRes.count || 0;

    // Estimate MRR from converted leads' plans
    const planPrices: Record<string, number> = { starter: 197, popular: 297, premium: 397 };
    let monthlyRevenue = 0;
    if (convertedRes.data) {
      for (const lead of convertedRes.data) {
        monthlyRevenue += planPrices[lead.plan as string] || 0;
      }
    }

    return NextResponse.json({
      totalLeads,
      conversions,
      pendingIntakes,
      activeSubscribers,
      monthlyRevenue,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json(
      {
        totalLeads: 0,
        conversions: 0,
        pendingIntakes: 0,
        activeSubscribers: 0,
        monthlyRevenue: 0,
      }
    );
  }
}
