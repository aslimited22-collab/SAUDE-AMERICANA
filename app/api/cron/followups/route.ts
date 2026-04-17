import { NextResponse } from "next/server";
import { FollowupAgent } from "@/lib/agents/followup-agent";

// GET/POST /api/cron/followups
// Invoked by Vercel Cron on a schedule (see vercel.json).
// Authenticated via Vercel's signed "Authorization: Bearer $CRON_SECRET" header
// or the standard ADMIN_API_TOKEN. Processes due notifications in batches.
function isAuthorized(request: Request): boolean {
  const header = request.headers.get("authorization") ?? "";

  // Vercel Cron: "Authorization: Bearer $CRON_SECRET"
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && header === `Bearer ${cronSecret}`) return true;

  // Manual / admin call
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (adminToken && header === `Bearer ${adminToken}`) return true;

  return process.env.NODE_ENV === "development";
}

async function runBatch(limit = 50) {
  const result = await FollowupAgent.processDueNotifications(limit);
  return result;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const result = await runBatch(limit);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data ?? { processed: 0 });
}

export async function POST(request: Request) {
  return GET(request);
}
