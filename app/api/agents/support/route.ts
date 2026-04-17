import { NextResponse } from "next/server";
import { SupportAgent, InboundMessageSchema } from "@/lib/agents/support-agent";

// Requires ADMIN_API_TOKEN — this endpoint is for internal/admin use.
// Inbound SMS from patients is handled via /api/webhooks/twilio (Twilio-signed).
function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken) return process.env.NODE_ENV === "development";
  return authHeader === `Bearer ${adminToken}`;
}

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

  const parsed = InboundMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 422 }
    );
  }

  const result = await SupportAgent.handleInbound(parsed.data);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Agent error" },
      { status: 500 }
    );
  }

  return NextResponse.json(result.data, { status: 200 });
}
