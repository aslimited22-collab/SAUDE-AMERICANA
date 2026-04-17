import twilio from "twilio";

let _client: twilio.Twilio | null = null;

export function getTwilio(): twilio.Twilio {
  if (!_client) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!accountSid || !authToken) {
      throw new Error(
        "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables must be set"
      );
    }
    _client = twilio(accountSid, authToken);
  }
  return _client;
}

// From-number helpers — Twilio WhatsApp uses whatsapp: prefix
export function getSmsNumber(): string {
  const n = process.env.TWILIO_SMS_NUMBER;
  if (!n) throw new Error("TWILIO_SMS_NUMBER not set");
  return n;
}

export function getWhatsAppNumber(): string {
  const n = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!n) throw new Error("TWILIO_WHATSAPP_NUMBER not set");
  return n.startsWith("whatsapp:") ? n : `whatsapp:${n}`;
}

// Verify Twilio webhook signature
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;
  return twilio.validateRequest(authToken, signature, url, params);
}
