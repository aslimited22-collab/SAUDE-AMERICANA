import { z } from "zod";
import { BaseAgent, type AgentResult } from "./base-agent";
import { getAnthropic, CLAUDE_MODEL } from "@/lib/anthropic";
import { getServiceSupabase } from "@/lib/supabase";

// ─── Input Schema ─────────────────────────────────────────────────────────────
export const QualificationInputSchema = z.object({
  leadId: z.string().uuid(),
  firstName: z.string().min(1),
  email: z.string().email(),
  quizAnswers: z.record(z.string(), z.unknown()),
});

export type QualificationInput = z.infer<typeof QualificationInputSchema>;

// ─── Output Types ─────────────────────────────────────────────────────────────
export interface QualificationDecision {
  qualified: boolean;
  score: number; // 0–100
  reasoning: string;
  flags: Array<{
    flag: string;
    severity: "info" | "warning" | "disqualify";
    reason: string;
  }>;
  disqualifiedReason?: string;
  recommendedPlan?: "starter" | "popular" | "premium";
  nextStep: "proceed_to_checkout" | "manual_review" | "disqualified";
}

// ─── FDA Criteria ─────────────────────────────────────────────────────────────
// GLP-1 (semaglutide/tirzepatide) FDA eligibility criteria:
// APPROVED: BMI ≥ 30, OR BMI ≥ 27 + weight-related comorbidity
// COMORBIDITIES: T2DM, hypertension, dyslipidemia, obstructive sleep apnea, CVD
// CONTRAINDICATIONS: personal/family hx of MTC or MEN 2, acute pancreatitis,
//   Type 1 DM, active gallbladder disease, severe renal/hepatic impairment
// AGE: 18–75 (program restriction, not FDA absolute)
// PREGNANCY: contraindicated

const FDA_SYSTEM_PROMPT = `You are a clinical decision-support AI for a telehealth GLP-1 weight loss program.
You analyze patient quiz submissions to determine FDA-guideline eligibility for GLP-1 medications
(semaglutide/tirzepatide). You do NOT diagnose or prescribe — you flag eligibility and risks for
licensed physician review.

FDA ELIGIBILITY CRITERIA FOR GLP-1 AGONISTS:
QUALIFIED if:
- BMI ≥ 30 kg/m², OR
- BMI ≥ 27 kg/m² WITH at least one weight-related comorbidity:
  (Type 2 diabetes, hypertension, dyslipidemia, obstructive sleep apnea, cardiovascular disease)
- Age 18–75

ABSOLUTE CONTRAINDICATIONS (must disqualify):
- Personal or family history of medullary thyroid carcinoma (MTC)
- Multiple Endocrine Neoplasia syndrome type 2 (MEN 2)
- History of acute pancreatitis attributed to GLP-1 use
- Type 1 diabetes mellitus (insulin-dependent)
- Pregnancy or planned pregnancy within 2 months
- Currently breastfeeding

RELATIVE CONTRAINDICATIONS (flag for manual review):
- Severe renal impairment (eGFR < 15) or dialysis
- Severe hepatic impairment (Child-Pugh C)
- Active gallbladder disease / recent cholecystectomy
- History of gastroparesis or severe GI dysmotility
- Personal history of pancreatitis (not GLP-1 related)
- Current use of insulin or sulfonylureas (hypoglycemia risk)
- Eating disorder history (anorexia/bulimia)
- Age < 18 or > 75
- Active suicidal ideation

SCORING GUIDE:
- 85–100: Clearly eligible, low risk. Proceed to checkout.
- 65–84: Eligible with minor flags. Proceed but note flags.
- 40–64: Borderline — manual physician review required.
- 0–39: Likely ineligible or high risk — manual review before proceeding.

Respond with a JSON object only, no other text.`;

// ─── Qualification Agent ──────────────────────────────────────────────────────
class QualificationAgentClass extends BaseAgent {
  constructor() {
    super("qualification", "QualificationAgent");
  }

  private calculateBMI(weightLbs: number, heightIn: number): number {
    if (heightIn <= 0) return 0;
    return (weightLbs / (heightIn * heightIn)) * 703;
  }

  async qualify(input: QualificationInput): Promise<AgentResult<QualificationDecision>> {
    const taskId = await this.createTask("qualify_lead", { leadId: input.leadId }, {
      leadId: input.leadId,
      priority: 3,
    });

    return this.safeExecute(
      async () => {
        const answers = input.quizAnswers as Record<string, string | number | boolean>;

        // Pre-compute BMI if weight/height are in the quiz answers
        const weightLbs =
          typeof answers.weight === "number"
            ? answers.weight
            : parseFloat(String(answers.weight ?? "0"));
        const heightIn =
          typeof answers.height_inches === "number"
            ? answers.height_inches
            : (typeof answers.height === "string"
                ? this.parseHeightToInches(answers.height)
                : 0);
        const bmi = this.calculateBMI(weightLbs, heightIn);

        // Build structured patient context for Claude
        const patientContext = {
          ...answers,
          computed_bmi: bmi > 0 ? parseFloat(bmi.toFixed(1)) : undefined,
        };

        const anthropic = getAnthropic();

        const message = await this.withRetry(
          () =>
            anthropic.messages.create({
              model: CLAUDE_MODEL,
              max_tokens: 1024,
              system: FDA_SYSTEM_PROMPT,
              messages: [
                {
                  role: "user",
                  content: `Analyze this patient quiz submission and return a JSON qualification decision.

Patient data:
${JSON.stringify(patientContext, null, 2)}

Return ONLY a JSON object with this exact structure:
{
  "qualified": boolean,
  "score": number (0-100),
  "reasoning": "string explaining the decision",
  "flags": [{"flag": "string", "severity": "info|warning|disqualify", "reason": "string"}],
  "disqualifiedReason": "string or null",
  "recommendedPlan": "starter|popular|premium or null",
  "nextStep": "proceed_to_checkout|manual_review|disqualified"
}`,
                },
              ],
            }),
          { maxAttempts: 3, initialDelayMs: 2_000 },
          taskId
        );

        const rawText =
          message.content[0].type === "text" ? message.content[0].text : "";

        // Parse JSON from Claude response
        let decision: QualificationDecision;
        try {
          // Extract JSON even if Claude wraps it in markdown
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("No JSON found in AI response");
          decision = JSON.parse(jsonMatch[0]) as QualificationDecision;
        } catch {
          throw new Error(`Failed to parse AI qualification response: ${rawText.slice(0, 200)}`);
        }

        // Persist decision to database
        const supabase = getServiceSupabase();
        await supabase
          .from("leads")
          .update({
            qualification_score: decision.score,
            qualification_notes: decision.reasoning,
            qualified_at: decision.qualified ? new Date().toISOString() : null,
            disqualified_reason: decision.disqualifiedReason ?? null,
          })
          .eq("id", input.leadId);

        // If intake exists, update ai_risk_score and flags
        await supabase
          .from("medical_intakes")
          .update({
            ai_risk_score: decision.score,
            ai_flags: decision.flags,
          })
          .eq("lead_id", input.leadId);

        return decision;
      },
      {
        action: "qualify_lead",
        resource_type: "lead",
        resource_id: input.leadId,
        phi_accessed: true,
        patient_id: input.leadId,
        taskId,
      }
    );
  }

  // Parse height strings like "5'10\"", "5ft 10in", "70" into inches
  private parseHeightToInches(height: string): number {
    const feetInches = height.match(/(\d+)\s*(?:ft|'|feet)\s*(\d+)\s*(?:in|"|inches?)?/i);
    if (feetInches) {
      return parseInt(feetInches[1]) * 12 + parseInt(feetInches[2]);
    }
    const inchOnly = height.match(/^(\d+)(?:\s*(?:in|inches?))?$/i);
    if (inchOnly) return parseInt(inchOnly[1]);
    return 0;
  }
}

export const QualificationAgent = new QualificationAgentClass();
