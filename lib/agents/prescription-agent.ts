import { z } from "zod";
import { BaseAgent, type AgentResult } from "./base-agent";
import { getAnthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import { getServiceSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";

// ─── Input Schema ─────────────────────────────────────────────────────────────
export const PrescriptionInputSchema = z.object({
  leadId: z.string().uuid(),
  intakeId: z.string().uuid(),
  action: z.enum(["prepare", "send_to_pharmacy", "track_shipment", "notify_patient"]),
});

export type PrescriptionInput = z.infer<typeof PrescriptionInputSchema>;

// ─── Dosing Protocol ──────────────────────────────────────────────────────────
// FDA-approved dose escalation schedules for compounded semaglutide
const DOSE_PROTOCOL = {
  semaglutide: {
    starter: { initial_mg: 0.25, escalation_weeks: 4, max_mg: 1.0 },
    popular:  { initial_mg: 0.5,  escalation_weeks: 4, max_mg: 2.0 },
    premium:  { initial_mg: 0.5,  escalation_weeks: 4, max_mg: 2.4 },
  },
  tirzepatide: {
    starter: { initial_mg: 2.5,  escalation_weeks: 4, max_mg: 10 },
    popular:  { initial_mg: 5.0,  escalation_weeks: 4, max_mg: 15 },
    premium:  { initial_mg: 5.0,  escalation_weeks: 4, max_mg: 15 },
  },
} as const;

// ─── Prescription Agent ───────────────────────────────────────────────────────
class PrescriptionAgentClass extends BaseAgent {
  constructor() {
    super("prescription", "PrescriptionAgent");
  }

  // Step 1: Prepare prescription data based on intake + plan
  async preparePrescription(
    leadId: string,
    intakeId: string
  ): Promise<AgentResult<{ prescriptionId: string; summary: string }>> {
    const taskId = await this.createTask("prepare_prescription", { leadId, intakeId }, {
      leadId,
      priority: 2,
    });

    return this.safeExecute(
      async () => {
        const supabase = getServiceSupabase();

        // Fetch lead + intake data
        const { data: lead, error: leadErr } = await supabase
          .from("leads")
          .select("*")
          .eq("id", leadId)
          .single();
        if (leadErr || !lead) throw new Error("Lead not found");

        const { data: intake, error: intakeErr } = await supabase
          .from("medical_intakes")
          .select("*")
          .eq("id", intakeId)
          .single();
        if (intakeErr || !intake) throw new Error("Medical intake not found");

        if (!intake.reviewed) {
          throw new Error("Medical intake has not been reviewed by a provider yet");
        }

        // Ask Claude to select appropriate medication and dose
        const anthropic = getAnthropic();
        const message = await this.withRetry(
          () =>
            anthropic.messages.create({
              model: CLAUDE_MODEL,
              max_tokens: 512,
              system: `You are a clinical pharmacist AI assistant. Based on patient medical history,
you determine the appropriate starting GLP-1 medication and dose following FDA guidelines.
Return ONLY a JSON object — no other text.`,
              messages: [
                {
                  role: "user",
                  content: `Determine appropriate GLP-1 medication for this patient.

Patient plan: ${lead.plan}
Medical conditions: ${JSON.stringify(intake.medical_conditions)}
Current medications: ${JSON.stringify(intake.medications)}
Allergies: ${intake.allergies}
Vitals: ${JSON.stringify(intake.vitals)}
Weight loss history: ${JSON.stringify(intake.weight_loss_history)}
AI flags: ${JSON.stringify(intake.ai_flags)}

Available medications:
- semaglutide (Ozempic analog) — preferred if no contraindications
- tirzepatide (Mounjaro analog) — use if semaglutide previously failed or T2DM present

Dose protocols:
${JSON.stringify(DOSE_PROTOCOL, null, 2)}

Return JSON:
{
  "medication": "semaglutide|tirzepatide",
  "initial_dose_mg": number,
  "frequency": "weekly",
  "quantity": number (units for 30 days),
  "refills": number,
  "clinical_notes": "brief rationale",
  "contraindication_check": "none|flag_for_review"
}`,
                },
              ],
            }),
          {},
          taskId
        );

        const rawText =
          message.content[0].type === "text" ? message.content[0].text : "";
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON from prescription AI");

        const rx = JSON.parse(jsonMatch[0]) as {
          medication: string;
          initial_dose_mg: number;
          frequency: string;
          quantity: number;
          refills: number;
          clinical_notes: string;
          contraindication_check: string;
        };

        if (rx.contraindication_check === "flag_for_review") {
          await this.escalate(
            taskId,
            "AI flagged potential contraindication requiring physician review",
            { leadId, intakeId, rx_suggestion: rx },
            leadId
          );
          throw new Error("Prescription flagged for manual physician review");
        }

        // Insert prescription record
        const { data: prescription, error: rxErr } = await supabase
          .from("prescriptions")
          .insert({
            lead_id: leadId,
            intake_id: intakeId,
            medication_name: rx.medication,
            dose_mg: rx.initial_dose_mg,
            frequency: rx.frequency,
            quantity: rx.quantity,
            refills: rx.refills,
            pharmacy_name: process.env.COMPOUNDING_PHARMACY_NAME ?? "Precision Compounding",
            pharmacy_npi: process.env.COMPOUNDING_PHARMACY_NPI,
            pharmacy_dea: process.env.COMPOUNDING_PHARMACY_DEA,
          })
          .select("id")
          .single();

        if (rxErr || !prescription) throw new Error(`Failed to create prescription: ${rxErr?.message}`);

        // Mark intake as prescription prepared
        await supabase
          .from("medical_intakes")
          .update({ prescription_sent: false }) // Will be updated when actually sent
          .eq("id", intakeId);

        return {
          prescriptionId: prescription.id as string,
          summary: `${rx.medication} ${rx.initial_dose_mg}mg ${rx.frequency} — ${rx.clinical_notes}`,
        };
      },
      {
        action: "prepare_prescription",
        resource_type: "prescription",
        resource_id: intakeId,
        phi_accessed: true,
        patient_id: leadId,
        taskId,
      }
    );
  }

  // Step 2: Send prescription to compounding pharmacy API
  async sendToPharmacy(
    prescriptionId: string,
    leadId: string
  ): Promise<AgentResult<{ confirmationNumber: string }>> {
    const taskId = await this.createTask("send_to_pharmacy", { prescriptionId, leadId }, {
      leadId,
      priority: 1,
    });

    return this.safeExecute(
      async () => {
        const supabase = getServiceSupabase();

        const { data: rx } = await supabase
          .from("prescriptions")
          .select("*, leads(*), medical_intakes(*)")
          .eq("id", prescriptionId)
          .single();

        if (!rx) throw new Error("Prescription not found");

        // Call compounding pharmacy API
        // Replace with actual pharmacy partner API (e.g., Wells Pharmacy, Empower Pharmacy)
        const pharmacyApiUrl = process.env.PHARMACY_API_URL;
        const pharmacyApiKey = process.env.PHARMACY_API_KEY;

        if (!pharmacyApiUrl || !pharmacyApiKey) {
          throw new Error("Pharmacy API credentials not configured");
        }

        const pharmacyPayload = {
          prescription: {
            medication: rx.medication_name,
            strength: `${rx.dose_mg}mg/mL`,
            quantity: rx.quantity,
            refills: rx.refills,
            sig: `Inject ${rx.dose_mg}mg subcutaneously once weekly`,
            daw: false,
          },
          patient: {
            first_name: (rx.leads as Record<string, string>)?.first_name,
            last_name: (rx.medical_intakes as Record<string, unknown>)?.personal_info
              ? ((rx.medical_intakes as Record<string, unknown>).personal_info as Record<string, string>)?.last_name
              : "",
            dob: (rx.medical_intakes as Record<string, unknown>)?.personal_info
              ? ((rx.medical_intakes as Record<string, unknown>).personal_info as Record<string, string>)?.dob
              : "",
            address: (rx.medical_intakes as Record<string, unknown>)?.personal_info
              ? ((rx.medical_intakes as Record<string, unknown>).personal_info as Record<string, string>)?.address
              : "",
          },
          prescriber: {
            npi: process.env.PRESCRIBER_NPI,
            dea: process.env.PRESCRIBER_DEA,
            name: process.env.PRESCRIBER_NAME,
          },
        };

        const response = await this.withRetry(
          async () => {
            const res = await fetch(pharmacyApiUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${pharmacyApiKey}`,
                "X-Client-ID": "slimrx",
              },
              body: JSON.stringify(pharmacyPayload),
            });

            if (!res.ok) {
              const text = await res.text();
              throw new Error(`Pharmacy API error ${res.status}: ${text}`);
            }

            return res.json() as Promise<{ confirmation_number: string }>;
          },
          { maxAttempts: 3, initialDelayMs: 5_000 },
          taskId
        );

        const confirmationNumber = response.confirmation_number;

        // Update prescription record
        await supabase
          .from("prescriptions")
          .update({
            sent_to_pharmacy: true,
            sent_at: new Date().toISOString(),
            pharmacy_confirmation: confirmationNumber,
          })
          .eq("id", prescriptionId);

        await supabase
          .from("medical_intakes")
          .update({
            prescription_sent: true,
            prescription_sent_at: new Date().toISOString(),
          })
          .eq("id", rx.intake_id as string);

        return { confirmationNumber };
      },
      {
        action: "send_to_pharmacy",
        resource_type: "prescription",
        resource_id: prescriptionId,
        phi_accessed: true,
        patient_id: leadId,
        taskId,
      }
    );
  }

  // Step 3: Notify patient that prescription is on its way
  async notifyPatient(
    leadId: string,
    prescriptionId: string
  ): Promise<AgentResult<void>> {
    const taskId = await this.createTask("notify_patient_prescription", { leadId }, {
      leadId,
      priority: 3,
    });

    return this.safeExecute(
      async () => {
        const supabase = getServiceSupabase();
        const { data: lead } = await supabase
          .from("leads")
          .select("first_name, email")
          .eq("id", leadId)
          .single();

        if (!lead) throw new Error("Lead not found");

        const resend = getResend();
        await resend.emails.send({
          from: "SlimRx Medical Team <medical@slimrx.com>",
          to: lead.email as string,
          subject: "Great news — your prescription has been sent! 💉",
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
              <div style="background: linear-gradient(135deg, #0A1628 0%, #1a3a6b 100%); padding: 32px; border-radius: 12px 12px 0 0;">
                <h1 style="color: #00D4B4; margin: 0; font-size: 24px;">Your prescription is on its way!</h1>
              </div>
              <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                <p>Hi ${lead.first_name},</p>
                <p>Your prescription has been reviewed and sent to our compounding pharmacy. Here's what happens next:</p>
                <ol style="padding-left: 20px; line-height: 2;">
                  <li><strong>Pharmacy prepares your medication</strong> (1–2 business days)</li>
                  <li><strong>Shipped to your door</strong> via USPS Priority Mail or overnight</li>
                  <li><strong>You'll receive a tracking number</strong> via SMS when it ships</li>
                </ol>
                <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; margin: 24px 0;">
                  <strong>💊 Getting started:</strong> Once you receive your medication, inject ${process.env.NEXT_PUBLIC_SITE_URL}/instructions — our guide walks you through your first dose.
                </div>
                <p style="color: #6b7280; font-size: 14px;">Questions? Reply to this email or text us at ${process.env.SUPPORT_SMS_NUMBER ?? "(800) 555-0100"}</p>
                <p>— The SlimRx Medical Team</p>
              </div>
            </div>
          `,
        });
      },
      {
        action: "notify_patient_prescription",
        resource_type: "lead",
        resource_id: leadId,
        phi_accessed: false,
        patient_id: leadId,
        taskId,
      }
    );
  }

  // Full orchestration: prepare → send → notify
  async orchestrate(input: PrescriptionInput): Promise<AgentResult<unknown>> {
    switch (input.action) {
      case "prepare":
        return this.preparePrescription(input.leadId, input.intakeId);
      case "send_to_pharmacy":
        return this.sendToPharmacy(input.intakeId, input.leadId);
      case "notify_patient":
        return this.notifyPatient(input.leadId, input.intakeId);
      default:
        return { success: false, error: `Unknown action: ${input.action}` };
    }
  }
}

export const PrescriptionAgent = new PrescriptionAgentClass();
