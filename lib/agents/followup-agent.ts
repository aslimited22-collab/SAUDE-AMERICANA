import { z } from "zod";
import { BaseAgent, type AgentResult } from "./base-agent";
import { getAnthropic, CLAUDE_HAIKU } from "@/lib/anthropic";
import { getServiceSupabase } from "@/lib/supabase";
import { getTwilio, getSmsNumber, getWhatsAppNumber } from "@/lib/twilio";
import { getResend } from "@/lib/resend";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "week_1_checkin"
  | "week_2_checkin"
  | "month_1_review"
  | "month_2_dose_increase"
  | "month_3_midpoint"
  | "month_6_halfway"
  | "month_9_completion"
  | "missed_dose"
  | "refill_reminder"
  | "side_effect_followup"
  | "win_back";

export const ScheduleFollowupsSchema = z.object({
  leadId: z.string().uuid(),
  treatmentStartDate: z.string().datetime().optional(), // ISO string; defaults to now
  preferredChannel: z.enum(["sms", "whatsapp", "email"]).optional(),
});

export type ScheduleFollowupsInput = z.infer<typeof ScheduleFollowupsSchema>;

export const ProcessDueSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
});

// ─── Notification schedule (days from treatment start) ───────────────────────
const FOLLOWUP_SCHEDULE: Array<{
  type: NotificationType;
  daysFromStart: number;
}> = [
  { type: "week_1_checkin", daysFromStart: 7 },
  { type: "week_2_checkin", daysFromStart: 14 },
  { type: "month_1_review", daysFromStart: 30 },
  { type: "month_2_dose_increase", daysFromStart: 60 },
  { type: "month_3_midpoint", daysFromStart: 90 },
  { type: "month_6_halfway", daysFromStart: 180 },
  { type: "month_9_completion", daysFromStart: 270 },
];

// ─── Human-readable context per notification type ─────────────────────────────
const NOTIFICATION_CONTEXT: Record<
  NotificationType,
  { subject: string; purpose: string }
> = {
  week_1_checkin: {
    subject: "How's your first week going?",
    purpose:
      "First week check-in. Ask how they're tolerating their first dose, answer common early side effect questions, encourage them.",
  },
  week_2_checkin: {
    subject: "Checking in — week 2",
    purpose:
      "Week 2 check-in. Many patients see early appetite reduction by now. Celebrate any wins, address side effects.",
  },
  month_1_review: {
    subject: "Your 1-month progress check",
    purpose:
      "One month milestone. Ask about appetite changes, any weight loss noticed, energy levels. Remind them results build over 3-9 months.",
  },
  month_2_dose_increase: {
    subject: "Dose update — month 2",
    purpose:
      "Month 2 — their dose may be increasing soon. Explain that dose escalation is normal and expected. Prepare them for the next step.",
  },
  month_3_midpoint: {
    subject: "3-month milestone — you're making progress!",
    purpose:
      "3-month milestone celebration. Acknowledge their commitment. Note that the 3-6 month window is when most patients see the most significant changes.",
  },
  month_6_halfway: {
    subject: "Halfway there — 6 months strong",
    purpose:
      "6-month halfway celebration. Major milestone. Reinforce adherence, discuss how far they've come, look ahead to completing treatment.",
  },
  month_9_completion: {
    subject: "9 months — your transformation journey",
    purpose:
      "9-month completion milestone. Celebrate their dedication. Discuss maintenance phase options, continuing care.",
  },
  missed_dose: {
    subject: "Missed dose — what to do next",
    purpose:
      "Gentle reminder after a missed dose. Explain what to do (inject within 5 days or skip), reassure that one missed dose won't derail progress.",
  },
  refill_reminder: {
    subject: "Time to refill your medication",
    purpose:
      "Upcoming refill reminder. Let them know their refill is coming up and the pharmacy is preparing it.",
  },
  side_effect_followup: {
    subject: "Following up on how you're feeling",
    purpose:
      "24-hour follow-up after a patient reported side effects. Check if they're feeling better, offer additional guidance.",
  },
  win_back: {
    subject: "We miss you — come back to your program",
    purpose:
      "Win-back message for patients who paused or lapsed. Warm, no-pressure, remind them their program is still there.",
  },
};

// ─── FollowupAgent ────────────────────────────────────────────────────────────

class FollowupAgentClass extends BaseAgent {
  constructor() {
    super("followup", "FollowupAgent");
  }

  // ── Schedule all followup notifications for a new patient ─────────────────
  async schedulePatientFollowups(
    input: ScheduleFollowupsInput
  ): Promise<AgentResult<{ scheduled: number; notifications: string[] }>> {
    const taskId = await this.createTask(
      "schedule_patient_followups",
      { lead_id: input.leadId },
      { leadId: input.leadId, priority: 4 }
    );

    return this.safeExecute(
      async () => {
        const supabase = getServiceSupabase();

        // Verify lead exists and is a converted patient
        const { data: lead, error: leadErr } = await supabase
          .from("leads")
          .select("id, first_name, phone, email, subscription_status")
          .eq("id", input.leadId)
          .single();

        if (leadErr || !lead) throw new Error("Lead not found");
        if (lead.subscription_status !== "active") {
          throw new Error(
            `Cannot schedule followups for lead with status: ${lead.subscription_status as string}`
          );
        }

        const startDate = input.treatmentStartDate
          ? new Date(input.treatmentStartDate)
          : new Date();

        const channel = input.preferredChannel ?? this.inferChannel(lead);

        // Check for already-scheduled notifications to avoid duplicates
        const { data: existing } = await supabase
          .from("patient_notifications")
          .select("notification_type")
          .eq("lead_id", input.leadId)
          .eq("sent", false);

        const existingTypes = new Set(
          (existing ?? []).map((n) => n.notification_type as string)
        );

        const toInsert = FOLLOWUP_SCHEDULE.filter(
          ({ type }) => !existingTypes.has(type)
        ).map(({ type, daysFromStart }) => {
          const scheduledFor = new Date(startDate);
          scheduledFor.setDate(scheduledFor.getDate() + daysFromStart);

          return {
            lead_id: input.leadId,
            notification_type: type,
            channel,
            scheduled_for: scheduledFor.toISOString(),
          };
        });

        if (toInsert.length === 0) {
          return { scheduled: 0, notifications: [] };
        }

        const { data: inserted, error: insertErr } = await supabase
          .from("patient_notifications")
          .insert(toInsert)
          .select("id");

        if (insertErr) throw new Error(`Failed to insert notifications: ${insertErr.message}`);

        const ids = (inserted ?? []).map((n) => n.id as string);

        // Set the next followup date on the lead
        const earliest = new Date(startDate);
        earliest.setDate(earliest.getDate() + FOLLOWUP_SCHEDULE[0].daysFromStart);

        await supabase
          .from("leads")
          .update({ next_followup_at: earliest.toISOString() })
          .eq("id", input.leadId);

        await this.log({
          actor_type: "agent",
          actor_id: this.agentName,
          action: "schedule_patient_followups",
          resource_type: "lead",
          resource_id: input.leadId,
          details: { count: toInsert.length, channel, start_date: startDate.toISOString() },
          phi_accessed: false,
          success: true,
          patient_id: input.leadId,
        });

        return { scheduled: toInsert.length, notifications: ids };
      },
      {
        action: "schedule_patient_followups",
        resource_type: "lead",
        resource_id: input.leadId,
        phi_accessed: false,
        patient_id: input.leadId,
        taskId,
      }
    );
  }

  // ── Process all due notifications (called by cron/API) ────────────────────
  async processDueNotifications(
    limit = 50
  ): Promise<AgentResult<{ processed: number; failed: number; skipped: number }>> {
    const taskId = await this.createTask(
      "process_due_notifications",
      { limit },
      { priority: 5 }
    );

    return this.safeExecute(
      async () => {
        const supabase = getServiceSupabase();

        // Fetch due notifications ordered by scheduled time
        const { data: due, error } = await supabase
          .from("patient_notifications")
          .select("*")
          .eq("sent", false)
          .lte("scheduled_for", new Date().toISOString())
          .order("scheduled_for", { ascending: true })
          .limit(limit);

        if (error) throw new Error(`Failed to fetch notifications: ${error.message}`);
        if (!due || due.length === 0) {
          return { processed: 0, failed: 0, skipped: 0 };
        }

        let processed = 0;
        let failed = 0;
        let skipped = 0;

        for (const notification of due) {
          try {
            const leadId = notification.lead_id as string;

            // Fetch patient data
            const { data: lead } = await supabase
              .from("leads")
              .select(
                "id, first_name, email, phone, plan, current_month, subscription_status"
              )
              .eq("id", leadId)
              .maybeSingle();

            if (!lead) {
              skipped++;
              await supabase
                .from("patient_notifications")
                .update({ sent: true, sent_at: new Date().toISOString(), notes: "skipped: lead not found" })
                .eq("id", notification.id as string);
              continue;
            }

            // Skip if subscription is canceled (not win_back type)
            if (
              (lead.subscription_status as string) === "canceled" &&
              notification.notification_type !== "win_back"
            ) {
              skipped++;
              await supabase
                .from("patient_notifications")
                .update({ sent: true, sent_at: new Date().toISOString(), notes: "skipped: subscription canceled" })
                .eq("id", notification.id as string);
              continue;
            }

            // Fetch latest prescription for context
            const { data: rx } = await supabase
              .from("prescriptions")
              .select("medication_name, dose_mg, tracking_number, shipped, delivered")
              .eq("lead_id", leadId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            // Generate personalized message
            const message = await this.generateCheckinMessage(
              notification.notification_type as NotificationType,
              lead as Record<string, unknown>,
              rx as Record<string, unknown> | null
            );

            // Send via appropriate channel
            const channel = notification.channel as "sms" | "whatsapp" | "email";
            const messageId = await this.sendNotification({
              notificationId: notification.id as string,
              leadId,
              channel,
              message,
              lead: lead as Record<string, unknown>,
            });

            // Mark notification as sent
            await supabase
              .from("patient_notifications")
              .update({
                sent: true,
                sent_at: new Date().toISOString(),
                message_id: messageId ?? null,
              })
              .eq("id", notification.id as string);

            // Update lead's followup timestamps
            const nextNotification = await this.getNextScheduledNotification(leadId);
            await supabase
              .from("leads")
              .update({
                last_followup_at: new Date().toISOString(),
                next_followup_at: nextNotification ?? null,
              })
              .eq("id", leadId);

            // Advance current_month based on notification type
            const monthAdvance = this.getMonthFromNotificationType(
              notification.notification_type as NotificationType
            );
            if (monthAdvance !== null) {
              await supabase
                .from("leads")
                .update({ current_month: monthAdvance })
                .eq("id", leadId);
            }

            processed++;
          } catch (err) {
            console.error(
              `[FollowupAgent] Failed to process notification ${notification.id as string}:`,
              err instanceof Error ? err.message : String(err)
            );
            failed++;
          }
        }

        await this.log({
          actor_type: "agent",
          actor_id: this.agentName,
          action: "process_due_notifications",
          details: { processed, failed, skipped, total: due.length },
          phi_accessed: true,
          success: true,
        });

        return { processed, failed, skipped };
      },
      {
        action: "process_due_notifications",
        resource_type: "patient_notification",
        phi_accessed: true,
        taskId,
      }
    );
  }

  // ── Generate a personalized check-in message via Claude Haiku ─────────────
  private async generateCheckinMessage(
    notificationType: NotificationType,
    lead: Record<string, unknown>,
    rx: Record<string, unknown> | null
  ): Promise<string> {
    const ctx = NOTIFICATION_CONTEXT[notificationType];
    const firstName = (lead.first_name as string | undefined) ?? "there";
    const plan = (lead.plan as string | undefined) ?? "unknown";
    const currentMonth = (lead.current_month as number | undefined) ?? 1;
    const medication = rx ? (rx.medication_name as string) : "your GLP-1 medication";
    const dose = rx ? `${rx.dose_mg as number}mg` : "your prescribed dose";

    const anthropic = getAnthropic();

    try {
      const response = await this.withRetry(
        () =>
          anthropic.messages.create({
            model: CLAUDE_HAIKU,
            max_tokens: 300,
            system: `You write warm, personalized check-in messages for GLP-1 weight loss patients at SlimRx.
Rules:
1. Warm, encouraging, conversational — like a supportive health coach
2. Specific to their treatment stage and notification type
3. Include 1 actionable tip or encouraging fact relevant to their stage
4. End with "Reply HELP anytime — we're here for you!"
5. Under 280 characters for SMS
6. Return ONLY the message text — no quotes, no preamble`,
            messages: [
              {
                role: "user",
                content: `Patient: ${firstName}
Plan: ${plan}
Treatment month: ${currentMonth} of 9
Medication: ${medication} ${dose}
Notification type: ${notificationType}
Purpose: ${ctx.purpose}

Write a personalized SMS check-in message. Under 280 chars.`,
              },
            ],
          }),
        { maxAttempts: 2 }
      );

      if (response.content[0].type === "text") {
        return response.content[0].text.trim();
      }
    } catch {
      // Fall through to static fallback
    }

    return this.staticFallbackMessage(notificationType, firstName, currentMonth);
  }

  // ── Send notification via appropriate channel ──────────────────────────────
  private async sendNotification(params: {
    notificationId: string;
    leadId: string;
    channel: "sms" | "whatsapp" | "email";
    message: string;
    lead: Record<string, unknown>;
  }): Promise<string | null> {
    const supabase = getServiceSupabase();

    if (params.channel === "email") {
      return this.sendEmailNotification(params.leadId, params.message, params.lead);
    }

    // SMS or WhatsApp
    const phone = params.lead.phone as string | undefined;
    if (!phone) {
      throw new Error(`No phone number for lead ${params.leadId}`);
    }

    const twilio = getTwilio();
    const from =
      params.channel === "whatsapp" ? getWhatsAppNumber() : getSmsNumber();
    const to =
      params.channel === "whatsapp" ? `whatsapp:${phone}` : phone;

    const msg = await this.withRetry(
      () =>
        twilio.messages.create({
          to,
          from,
          body: params.message,
        }),
      { maxAttempts: 3, initialDelayMs: 2_000 }
    );

    // Persist in patient_messages
    const { data: msgRecord } = await supabase
      .from("patient_messages")
      .insert({
        lead_id: params.leadId,
        direction: "outbound",
        channel: params.channel,
        from_number: from,
        to_number: to,
        body: params.message,
        twilio_sid: msg.sid,
        status: "sent",
        agent_id: this.agentName,
      })
      .select("id")
      .maybeSingle();

    return msgRecord?.id as string | null;
  }

  private async sendEmailNotification(
    leadId: string,
    message: string,
    lead: Record<string, unknown>
  ): Promise<string | null> {
    const email = lead.email as string | undefined;
    if (!email) throw new Error(`No email for lead ${leadId}`);

    const firstName = (lead.first_name as string | undefined) ?? "there";
    const resend = getResend();
    const supabase = getServiceSupabase();

    await resend.emails.send({
      from: "SlimRx Care Team <care@slimrx.com>",
      to: email,
      subject: "A note from your SlimRx care team",
      html: `
        <div style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
          <div style="background:linear-gradient(135deg,#0A1628 0%,#1a3a6b 100%);padding:28px 32px;border-radius:12px 12px 0 0;">
            <p style="color:#00D4B4;margin:0;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">SlimRx Care Team</p>
          </div>
          <div style="background:#fff;padding:32px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;">
            <p>Hi ${firstName},</p>
            <p style="line-height:1.7;">${message.replace(/\n/g, "<br>")}</p>
            <p style="color:#6b7280;font-size:13px;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
              Questions? Reply to this email or text us at ${process.env.SUPPORT_SMS_NUMBER ?? "(800) 555-0100"}
            </p>
          </div>
        </div>
      `,
    });

    const { data: msgRecord } = await supabase
      .from("patient_messages")
      .insert({
        lead_id: leadId,
        direction: "outbound",
        channel: "email",
        to_number: email,
        body: message,
        status: "sent",
        agent_id: this.agentName,
      })
      .select("id")
      .maybeSingle();

    return msgRecord?.id as string | null;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private inferChannel(
    lead: Record<string, unknown>
  ): "sms" | "whatsapp" | "email" {
    if (lead.phone) return "sms";
    if (lead.email) return "email";
    return "sms";
  }

  private async getNextScheduledNotification(
    leadId: string
  ): Promise<string | null> {
    const supabase = getServiceSupabase();
    const { data } = await supabase
      .from("patient_notifications")
      .select("scheduled_for")
      .eq("lead_id", leadId)
      .eq("sent", false)
      .order("scheduled_for", { ascending: true })
      .limit(1)
      .maybeSingle();

    return data ? (data.scheduled_for as string) : null;
  }

  private getMonthFromNotificationType(
    type: NotificationType
  ): number | null {
    const map: Partial<Record<NotificationType, number>> = {
      week_1_checkin: 1,
      week_2_checkin: 1,
      month_1_review: 1,
      month_2_dose_increase: 2,
      month_3_midpoint: 3,
      month_6_halfway: 6,
      month_9_completion: 9,
    };
    return map[type] ?? null;
  }

  private staticFallbackMessage(
    type: NotificationType,
    name: string,
    month: number
  ): string {
    const fallbacks: Record<NotificationType, string> = {
      week_1_checkin: `Hi ${name}! How's your first week going? Some nausea is normal — try eating small meals and staying hydrated. You've got this! Reply HELP anytime — we're here for you!`,
      week_2_checkin: `Hi ${name}! Week 2 — many patients notice appetite changes right about now. That's your GLP-1 working! Keep up the great work. Reply HELP anytime — we're here for you!`,
      month_1_review: `Hi ${name}! 1 month in — you're building great habits! Results compound over 3-9 months. Stay consistent and trust the process. Reply HELP anytime — we're here for you!`,
      month_2_dose_increase: `Hi ${name}! Month 2 milestone! Your dose may increase soon as part of your treatment plan — this is normal and expected. Reply HELP anytime — we're here for you!`,
      month_3_midpoint: `Hi ${name}! 3 months — amazing commitment! The next 3-6 months are when patients typically see their most significant progress. Keep going! Reply HELP anytime — we're here for you!`,
      month_6_halfway: `Hi ${name}! 6 months strong — you're halfway through your transformation journey! Your consistency is paying off. Reply HELP anytime — we're here for you!`,
      month_9_completion: `Hi ${name}! 9 months — what a journey! We're proud of your dedication to your health. Ask us about maintenance options. Reply HELP anytime — we're here for you!`,
      missed_dose: `Hi ${name}! Noticed you may have missed a dose. If it's been less than 5 days, go ahead and inject. Otherwise, skip and resume next week as scheduled. Reply HELP anytime — we're here for you!`,
      refill_reminder: `Hi ${name}! Your refill is coming up soon — our pharmacy is preparing your next supply. You'll get a tracking number when it ships! Reply HELP anytime — we're here for you!`,
      side_effect_followup: `Hi ${name}! Just checking in — how are you feeling today after the symptoms you mentioned? Reply HELP anytime — we're here for you!`,
      win_back: `Hi ${name}! We've been thinking of you. Your GLP-1 program is still here whenever you're ready to continue your journey. Reply RESTART to pick up where you left off. Reply HELP anytime — we're here for you!`,
    };

    return (
      fallbacks[type] ??
      `Hi ${name}! Checking in on your month ${month} of treatment. Keep up the great work — you're doing amazing! Reply HELP anytime — we're here for you!`
    );
  }
}

export const FollowupAgent = new FollowupAgentClass();
