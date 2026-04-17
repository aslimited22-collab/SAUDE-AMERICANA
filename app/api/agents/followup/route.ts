import { NextResponse } from "next/server";
import { z } from "zod";
import {
  FollowupAgent,
  ScheduleFollowupsSchema,
  ProcessDueSchema,
} from "@/lib/agents/followup-agent";

// Requires ADMIN_API_TOKEN — called by cron jobs or admin tooling.
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken) return process.env.NODE_ENV === "development";
  return authHeader === `Bearer ${adminToken}`;
}

const RequestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("schedule"), ...ScheduleFollowupsSchema.shape }),
  z.object({ action: z.literal("process_due"), ...ProcessDueSchema.shape }),
]);

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  if (parsed.data.action === "schedule") {
    const result = await FollowupAgent.schedulePatientFollowups(parsed.data);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Agent error" },
        { status: 500 }
      );
    }
    return NextResponse.json(result.data, { status: 200 });
  }

  // action === "process_due"
  const result = await FollowupAgent.processDueNotifications(
    parsed.data.limit ?? 50
  );
  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Agent error" },
      { status: 500 }
    );
  }
  return NextResponse.json(result.data, { status: 200 });
}
