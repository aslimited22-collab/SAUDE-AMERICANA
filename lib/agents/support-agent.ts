import { z } from "zod";
import { BaseAgent, type AgentResult } from "./base-agent";
import { getAnthropic, CLAUDE_MODEL, CLAUDE_HAIKU } from "@/lib/anthropic";
import { getServiceSupabase } from "@/lib/supabase";
import { getTwilio, getSmsNumber, getWhatsAppNumber } from "@/lib/twilio";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SupportIntent =
  | "tracking"
  | "side_effect"
  | "dose_question"
  | "cancel"
  | "billing"
  | "other";

export interface InboundMessageParams {
  from: string;          // E.164 phone number (SMS) or "whatsapp:+1..." (WhatsApp)
  body: string;          // message text
  channel: "sms" | "whatsapp";
  twilioSid?: string;
  mediaUrls?: string[];
}

export const InboundMessageSchema = z.object({
  from: z.string().min(1),
  body: z.string().min(1),
  channel: z.enum(["sms", "whatsapp"]),
  twilioSid: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
});

export type InboundMessage = z.infer<typeof InboundMessageSchema>;

// ─── SupportAgent ─────────────────────────────────────────────────────────────

class SupportAgentClass extends BaseAgent {
  constructor() {
    super("support", "SupportAgent");
  }

  // ── Main entry: process an inbound message ─────────────────────────────────
  async handleInbound(
    params: InboundMessageParams
  ): Promise<AgentResult<{ reply: string; intent: SupportIntent }>> {
    const taskId = await this.createTask(
      "handle_inbound_message",
      {
        from: params.from,
        channel: params.channel,
        twilio_sid: params.twilioSid ?? null,
      },
      { priority: 2 }
    );

    return this.safeExecute(
      async () => {
        const supabase = getServiceSupabase();

        // Normalize phone: strip whatsapp: prefix for DB lookup
        const normalizedFrom = params.from.replace(/^whatsapp:/, "");

        // Look up lead by phone number
        const { data: lead } = await supabase
          .from("leads")
          .select(
            "id, first_name, email, plan, current_month, subscription_status"
          )
          .eq("phone", normalizedFrom)
          .maybeSingle();

        // Determine the to-number (our side)
        const toNumber =
          params.channel === "whatsapp" ? getWhatsAppNumber() : getSmsNumber();

        // Persist inbound message
        const { data: inboundMsg } = await supabase
          .from("patient_messages")
          .insert({
            lead_id: lead?.id ?? null,
            direction: "inbound",
            channel: params.channel,
            from_number: params.from,
            to_number: toNumber,
            body: params.body,
            media_urls: params.mediaUrls
              ? params.mediaUrls.map((url) => ({ url }))
              : null,
            twilio_sid: params.twilioSid ?? null,
            status: "received",
            agent_id: this.agentName,
          })
          .select("id")
          .maybeSingle();

        const inboundMessageId = inboundMsg?.id as string | undefined;

        // Classify intent
        const { intent, confidence } = await this.classifyMessage(params.body);

        // Update message record with classification
        if (inboundMessageId) {
          await supabase
            .from("patient_messages")
            .update({ intent, intent_confidence: confidence })
            .eq("id", inboundMessageId);
        }

        // Route to appropriate handler — AI resolves everything, no human escalation
        let reply: string;
        switch (intent) {
          case "tracking":
            reply = await this.handleTracking(
              lead?.id,
              lead?.first_name as string | undefined
            );
            break;
          case "side_effect":
            reply = await this.handleSideEffect(
              lead?.id,
              lead?.first_name as string | undefined,
              params.body,
              taskId
            );
            break;
          case "dose_question":
            reply = await this.handleDoseQuestion(
              lead?.id,
              lead?.first_name as string | undefined,
              params.body,
              lead?.current_month as number | undefined
            );
            break;
          case "cancel":
            reply = await this.handleCancellation(
              lead?.id,
              lead?.first_name as string | undefined,
              params.body,
              lead?.plan as string | undefined,
              lead?.current_month as number | undefined
            );
            break;
          case "billing":
            reply = await this.handleBilling(
              lead?.id,
              lead?.first_name as string | undefined,
              lead?.subscription_status as string | undefined
            );
            break;
          default:
            reply = await this.handleOther(
              lead?.first_name as string | undefined,
              params.body
            );
        }

        // Send reply via Twilio and persist outbound record
        await this.sendReply({
          to: params.from,
          body: reply,
          channel: params.channel,
          leadId: lead?.id,
          intent,
        });

        await this.log({
          actor_type: "agent",
          actor_id: this.agentName,
          action: "handle_inbound_message",
          resource_type: "patient_message",
          resource_id: inboundMessageId,
          details: {
            intent,
            confidence,
            channel: params.channel,
            lead_found: !!lead,
          },
          phi_accessed: true,
          success: true,
          patient_id: lead?.id,
        });

        return { reply, intent };
      },
      {
        action: "handle_inbound_message",
        resource_type: "patient_message",
        phi_accessed: true,
        taskId,
      }
    );
  }

  // ── Classify message intent via Claude Haiku ───────────────────────────────
  private async classifyMessage(
    body: string
  ): Promise<{ intent: SupportIntent; confidence: number }> {
    const anthropic = getAnthropic();

    try {
      const response = await this.withRetry(
        () =>
          anthropic.messages.create({
            model: CLAUDE_HAIKU,
            max_tokens: 80,
            system:
              "Classify SMS/WhatsApp messages from GLP-1 weight loss patients. Return ONLY valid JSON with no extra text.",
            messages: [
              {
                role: "user",
                content: `Classify this patient message into exactly one intent:
- "tracking": order status, shipping, tracking number, when medication arrives
- "side_effect": reporting/asking about side effects (nausea, vomiting, pain, reactions, symptoms)
- "dose_question": dose amount, injection instructions, timing, missed dose, how to inject
- "cancel": wants to cancel, stop, or pause subscription
- "billing": charges, payment, invoice, refund, billing issue
- "other": anything else

Message: "${body.replace(/"/g, "'").slice(0, 500)}"

Return JSON: {"intent":"<intent>","confidence":<0.0-1.0>}`,
              },
            ],
          }),
        { maxAttempts: 2 }
      );

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";
      const match = text.match(/\{[\s\S]*?\}/);
      if (!match) throw new Error("No JSON in response");

      const parsed = JSON.parse(match[0]) as {
        intent?: SupportIntent;
        confidence?: number;
      };

      const validIntents: SupportIntent[] = [
        "tracking",
        "side_effect",
        "dose_question",
        "cancel",
        "billing",
        "other",
      ];
      const intent = validIntents.includes(parsed.intent ?? ("" as SupportIntent))
        ? (parsed.intent as SupportIntent)
        : "other";

      return { intent, confidence: parsed.confidence ?? 0.7 };
    } catch {
      return { intent: "other", confidence: 0.5 };
    }
  }

  // ── Tracking handler ───────────────────────────────────────────────────────
  private async handleTracking(
    leadId: string | undefined,
    firstName: string | undefined
  ): Promise<string> {
    const name = firstName ?? "there";

    if (!leadId) {
      return `Hi! We couldn't find your account. Please email support@slimrx.com with your registered email or visit ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://slimrx.com"}/support. Reply HELP for options.`;
    }

    try {
      const supabase = getServiceSupabase();
      const { data: rx } = await supabase
        .from("prescriptions")
        .select(
          "medication_name, dose_mg, shipped, shipped_at, tracking_number, carrier, delivered, delivered_at, sent_to_pharmacy"
        )
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!rx) {
        return `Hi ${name}! Your prescription is being prepared by our medical team. You'll get a tracking text once it ships — typically 1-2 business days after provider approval. Questions? Reply HELP.`;
      }

      if (rx.delivered) {
        return `Hi ${name}! Your ${rx.medication_name as string} was delivered. If it didn't arrive or needs replacement, reply MISSING and we'll investigate right away.`;
      }

      if (rx.shipped && rx.tracking_number) {
        const carrier = (rx.carrier as string | null) ?? "USPS";
        return `Hi ${name}! Your ${rx.medication_name as string} is on its way! Tracking: ${rx.tracking_number as string} via ${carrier}. Allow 3-5 business days. Reply HELP if you have questions.`;
      }

      if (rx.sent_to_pharmacy) {
        return `Hi ${name}! Your ${rx.medication_name as string} prescription is at our pharmacy being prepared. It ships in 1-2 business days and you'll get a tracking number via text!`;
      }

      return `Hi ${name}! Your prescription is under medical review. Once approved it heads to the pharmacy, then ships in 1-2 days. We'll text you every step. Reply HELP for support.`;
    } catch {
      return `Hi ${name}! We're looking into your order status. For immediate help, email support@slimrx.com or call ${process.env.SUPPORT_SMS_NUMBER ?? "our support line"}. Reply HELP for options.`;
    }
  }

  // ── Side effect handler — AI provides full clinical guidance ───────────────
  private async handleSideEffect(
    leadId: string | undefined,
    firstName: string | undefined,
    body: string,
    taskId: string
  ): Promise<string> {
    const name = firstName ?? "there";
    const anthropic = getAnthropic();

    try {
      const response = await this.withRetry(
        () =>
          anthropic.messages.create({
            model: CLAUDE_MODEL,
            max_tokens: 500,
            system: `You are a clinical support specialist for SlimRx, a GLP-1 telehealth program (semaglutide/tirzepatide).
You provide accurate, empathetic clinical guidance to patients experiencing side effects. You ALWAYS respond — never say to call a human.

EMERGENCY SYMPTOMS (direct to 911/ER immediately): chest pain, difficulty breathing, severe throat/tongue swelling, signs of pancreatitis (severe constant abdominal pain radiating to the back, with vomiting), anaphylaxis (hives + swelling + breathing trouble), heart palpitations with fainting.

NON-EMERGENCY management tips:
- Nausea/vomiting: eat small bland meals, stay hydrated, take medication at bedtime, avoid fatty/spicy foods, ginger tea
- Diarrhea/constipation: fiber, hydration, probiotics
- Injection site reactions: rotate sites, let medication reach room temp, use a new pen needle each time
- Headache: hydration, OTC acetaminophen (not NSAIDs with GLP-1)
- Fatigue: common in first 2-4 weeks, should improve

Response rules:
1. Start with empathy (acknowledge their symptom)
2. If EMERGENCY: begin response with "EMERGENCY — " and direct to call 911 or go to the nearest ER immediately. Then briefly explain why.
3. If non-emergency: give 2-3 specific management tips tailored to their exact symptom(s)
4. End non-emergency with: "If symptoms worsen or you have concerns, reply SIDE EFFECT and we'll follow up."
5. Keep total response under 320 characters for SMS
6. Return ONLY the patient-facing message — no preamble, no quotes`,
            messages: [
              {
                role: "user",
                content: `Patient name: ${name}
Patient reports: "${body.slice(0, 800)}"

Respond with clinical guidance. If emergency, lead with EMERGENCY.`,
              },
            ],
          }),
        { maxAttempts: 3 },
        taskId
      );

      const reply =
        response.content[0].type === "text"
          ? response.content[0].text.trim()
          : this.fallbackSideEffectMessage(name);

      // Schedule a side_effect_followup notification for 24 hours later
      if (leadId) {
        const supabase = getServiceSupabase();
        const followupAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await supabase.from("patient_notifications").insert({
          lead_id: leadId,
          notification_type: "side_effect_followup",
          channel: "sms",
          scheduled_for: followupAt.toISOString(),
          notes: `Side effect reported: ${body.slice(0, 200)}`,
        });
      }

      return reply;
    } catch {
      return this.fallbackSideEffectMessage(name);
    }
  }

  private fallbackSideEffectMessage(name: string): string {
    return `Hi ${name}! GLP-1 side effects like nausea are common — try eating small bland meals, staying hydrated, and taking your dose at bedtime. EMERGENCY symptoms (chest pain, severe breathing trouble): call 911 immediately. Reply HELP for more info.`;
  }

  // ── Dose question handler ──────────────────────────────────────────────────
  private async handleDoseQuestion(
    leadId: string | undefined,
    firstName: string | undefined,
    body: string,
    currentMonth: number | undefined
  ): Promise<string> {
    const name = firstName ?? "there";

    // Pull their actual prescription for accurate context
    let rxContext = "";
    if (leadId) {
      try {
        const supabase = getServiceSupabase();
        const { data: rx } = await supabase
          .from("prescriptions")
          .select("medication_name, dose_mg, frequency")
          .eq("lead_id", leadId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (rx) {
          rxContext = `Patient's prescription: ${rx.medication_name as string} ${rx.dose_mg as number}mg, ${rx.frequency as string}. Treatment month: ${currentMonth ?? 1} of 9.`;
        }
      } catch {
        // Non-fatal — continue without prescription context
      }
    }

    const anthropic = getAnthropic();

    try {
      const response = await this.withRetry(
        () =>
          anthropic.messages.create({
            model: CLAUDE_HAIKU,
            max_tokens: 350,
            system: `You are a clinical support specialist for a GLP-1 telehealth program.
Answer patient dose questions accurately for semaglutide and tirzepatide.

Key facts:
- Inject subcutaneously once weekly, same day each week
- Rotate sites: abdomen (2 inches from navel), outer thigh, upper arm
- Let pen/vial reach room temperature for 30 min before injecting
- If a dose is missed: inject as soon as remembered if within 5 days; otherwise skip and resume next scheduled day
- Never double-dose
- Store in refrigerator; once opened vials can be stored up to 28 days at room temperature

Always end with: "For specific medical questions, consult your SlimRx provider."
Keep response under 300 characters for SMS.
Return ONLY the patient-facing message.`,
            messages: [
              {
                role: "user",
                content: `${rxContext}
Patient ${name} asks: "${body.slice(0, 600)}"

Answer their specific question with accurate clinical information and the standard disclaimer.`,
              },
            ],
          }),
        { maxAttempts: 2 }
      );

      return response.content[0].type === "text"
        ? response.content[0].text.trim()
        : `Hi ${name}! Inject your GLP-1 once weekly, same day each week, subcutaneously (abdomen, thigh, or upper arm). If you missed a dose, inject within 5 days or skip and resume next week. For medical questions, consult your SlimRx provider.`;
    } catch {
      return `Hi ${name}! Inject your GLP-1 once weekly subcutaneously (abdomen, thigh, or upper arm). Same day each week. Missed dose: inject within 5 days of scheduled date. For medical questions, consult your SlimRx provider. Reply HELP for more.`;
    }
  }

  // ── Cancellation handler — AI generates personalized retention offer ────────
  private async handleCancellation(
    leadId: string | undefined,
    firstName: string | undefined,
    body: string,
    plan: string | undefined,
    currentMonth: number | undefined
  ): Promise<string> {
    const name = firstName ?? "there";
    const month = currentMonth ?? 1;
    const anthropic = getAnthropic();

    // Log the cancellation reason before responding
    if (leadId) {
      try {
        const supabase = getServiceSupabase();
        await supabase
          .from("subscriptions")
          .update({ cancellation_reason: body.slice(0, 500) })
          .eq("lead_id", leadId);
      } catch {
        // Non-fatal
      }
    }

    try {
      const response = await this.withRetry(
        () =>
          anthropic.messages.create({
            model: CLAUDE_HAIKU,
            max_tokens: 280,
            system: `You write empathetic, personalized retention messages for a GLP-1 weight loss telehealth program.
Rules:
1. Acknowledge their specific concern first (never guilt-trip)
2. Offer ONE concrete alternative: pause for 30 days (no charge), dose adjustment if side effects, or a provider check-in call
3. Include reply instructions: "Reply PAUSE to pause" or "Reply CALL for a provider check-in"
4. Warm, conversational tone — not salesy
5. Under 320 characters total
6. Return ONLY the SMS message text`,
            messages: [
              {
                role: "user",
                content: `Patient: ${name}
Plan: ${plan ?? "unknown"}
Treatment month: ${month} of 9
Their cancellation message: "${body.slice(0, 400)}"

Write a retention SMS addressing their specific reason with a concrete alternative. Under 320 chars.`,
              },
            ],
          }),
        { maxAttempts: 2 }
      );

      return response.content[0].type === "text"
        ? response.content[0].text.trim()
        : `Hi ${name}, we hear you! Before canceling, you can pause your subscription for 30 days at no charge — your progress stays intact. Reply PAUSE to pause or CALL to speak with your provider about adjusting your plan. We're here for you!`;
    } catch {
      return `Hi ${name}! We understand. You can pause for 30 days at no charge and keep your treatment progress. Reply PAUSE to pause now, or CALL to discuss options with your provider. We want to help you succeed!`;
    }
  }

  // ── Billing handler ────────────────────────────────────────────────────────
  private async handleBilling(
    leadId: string | undefined,
    firstName: string | undefined,
    subscriptionStatus: string | undefined
  ): Promise<string> {
    const name = firstName ?? "there";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://slimrx.com";

    const statusMessages: Record<string, string> = {
      active: `Hi ${name}! Your SlimRx subscription is active. For invoices, payment updates, or billing history: ${siteUrl}/billing — or email billing@slimrx.com. Reply HELP for more.`,
      paused: `Hi ${name}! Your subscription is paused. No charges while paused. To resume your GLP-1 shipments: ${siteUrl}/billing — or reply RESUME and we'll restart it. Reply HELP for help.`,
      past_due: `Hi ${name}! There's a payment issue with your account. Update your card to avoid pausing your medication: ${siteUrl}/billing — Reply HELP if you need assistance.`,
      canceled: `Hi ${name}! Your subscription is canceled. To restart your GLP-1 program: ${siteUrl}/checkout — We'd love to have you back! Reply HELP for questions.`,
      incomplete: `Hi ${name}! Your subscription setup isn't complete. Please visit ${siteUrl}/billing to resolve this so your medication isn't delayed. Reply HELP for assistance.`,
    };

    return (
      statusMessages[subscriptionStatus ?? ""] ??
      `Hi ${name}! For billing questions: ${siteUrl}/billing or email billing@slimrx.com. Our billing team responds within 1 business day. Reply HELP for immediate assistance.`
    );
  }

  // ── General/other handler ──────────────────────────────────────────────────
  private async handleOther(
    firstName: string | undefined,
    body: string
  ): Promise<string> {
    const name = firstName ?? "there";
    const anthropic = getAnthropic();

    try {
      const response = await this.withRetry(
        () =>
          anthropic.messages.create({
            model: CLAUDE_HAIKU,
            max_tokens: 220,
            system: `You are a friendly support specialist for SlimRx, a GLP-1 weight loss telehealth company.
Answer general questions helpfully. Direct specific medical questions to their SlimRx provider.

Helpful patient commands:
- TRACKING: check order status
- PAUSE: pause subscription for 30 days
- RESUME: resume paused subscription
- HELP: reach support team
- STOP: stop text messages

Keep response under 280 characters. Return ONLY the SMS message text.`,
            messages: [
              {
                role: "user",
                content: `Patient ${name} says: "${body.slice(0, 500)}"
Reply helpfully. Under 280 chars.`,
              },
            ],
          }),
        { maxAttempts: 2 }
      );

      return response.content[0].type === "text"
        ? response.content[0].text.trim()
        : `Hi ${name}! Thanks for reaching out. For order tracking reply TRACKING, to pause reply PAUSE, or email support@slimrx.com. We're here Mon–Fri 9am–6pm ET. Reply STOP to unsubscribe.`;
    } catch {
      return `Hi ${name}! Thanks for your message. Reply TRACKING for order status, HELP for support, or email support@slimrx.com. Mon–Fri 9am–6pm ET. Reply STOP to unsubscribe.`;
    }
  }

  // ── Send reply via Twilio + persist outbound record ────────────────────────
  private async sendReply(params: {
    to: string;
    body: string;
    channel: "sms" | "whatsapp";
    leadId?: string;
    intent: SupportIntent;
  }): Promise<void> {
    const from =
      params.channel === "whatsapp" ? getWhatsAppNumber() : getSmsNumber();
    const twilio = getTwilio();

    const msg = await this.withRetry(
      () =>
        twilio.messages.create({
          to: params.to,
          from,
          body: params.body,
        }),
      { maxAttempts: 3, initialDelayMs: 2_000 }
    );

    const supabase = getServiceSupabase();
    await supabase.from("patient_messages").insert({
      lead_id: params.leadId ?? null,
      direction: "outbound",
      channel: params.channel,
      from_number: from,
      to_number: params.to,
      body: params.body,
      twilio_sid: msg.sid,
      status: "sent",
      intent: params.intent,
      agent_id: this.agentName,
    });
  }
}

export const SupportAgent = new SupportAgentClass();
