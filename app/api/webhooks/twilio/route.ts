import { NextResponse } from "next/server";
import { validateTwilioSignature } from "@/lib/twilio";
import { SupportAgent } from "@/lib/agents/support-agent";

// ─── TwiML empty response ─────────────────────────────────────────────────────
// We send replies via SupportAgent → twilio.messages.create(), so we return
// an empty TwiML <Response/> to prevent Twilio from double-sending.
function twimlOk(): Response {
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function twimlError(message: string): Response {
  // Returning 200 even on errors so Twilio doesn't retry and cause duplicate replies.
  // Errors are logged inside the agent.
  console.error("[TwilioWebhook] Error:", message);
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

export async function POST(request: Request) {
  // ── Read raw body (needed for signature validation) ──────────────────────
  const rawBody = await request.text();

  // ── Validate Twilio signature ─────────────────────────────────────────────
  const signature = request.headers.get("x-twilio-signature") ?? "";

  if (!signature) {
    return new Response("Missing Twilio signature", { status: 400 });
  }

  // Reconstruct the URL exactly as Twilio sees it
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const url = new URL(request.url);
  const webhookUrl = `${proto}://${host}${url.pathname}`;

  // Parse body as URLSearchParams (Twilio sends application/x-www-form-urlencoded)
  const params: Record<string, string> = {};
  new URLSearchParams(rawBody).forEach((value, key) => {
    params[key] = value;
  });

  // Skip signature validation in local dev (Twilio can't reach localhost)
  const isLocalDev =
    process.env.NODE_ENV === "development" &&
    (host.startsWith("localhost") || host.startsWith("127.0.0.1"));

  if (!isLocalDev && !validateTwilioSignature(webhookUrl, params, signature)) {
    console.error(
      `[TwilioWebhook] Signature validation failed. URL: ${webhookUrl}`
    );
    return new Response("Invalid Twilio signature", { status: 403 });
  }

  // ── Extract message fields ────────────────────────────────────────────────
  const from = params["From"];
  const body = params["Body"];
  const messageSid = params["MessageSid"];
  const numMedia = parseInt(params["NumMedia"] ?? "0", 10);

  if (!from || body === undefined) {
    return twimlError("Missing From or Body");
  }

  // Determine channel from the From number
  const channel: "sms" | "whatsapp" = from.startsWith("whatsapp:")
    ? "whatsapp"
    : "sms";

  // Extract media URLs if present (MMS attachments)
  const mediaUrls: string[] = [];
  for (let i = 0; i < numMedia; i++) {
    const mediaUrl = params[`MediaUrl${i}`];
    if (mediaUrl) mediaUrls.push(mediaUrl);
  }

  // ── Dispatch to SupportAgent ──────────────────────────────────────────────
  // Fire-and-forget with error boundary — we must return TwiML quickly
  // (Twilio has a 15s timeout on webhooks)
  try {
    await SupportAgent.handleInbound({
      from,
      body: body.trim(),
      channel,
      twilioSid: messageSid,
      mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
    });
  } catch (err) {
    // Log but still return 200 — we don't want Twilio to retry
    return twimlError(err instanceof Error ? err.message : String(err));
  }

  return twimlOk();
}
