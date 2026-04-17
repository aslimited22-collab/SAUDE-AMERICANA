import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { QualificationAgent } from "@/lib/agents/qualification-agent";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, email, quizAnswers } = body;

    if (!firstName || !email) {
      return NextResponse.json(
        { error: "First name and email are required" },
        { status: 400 }
      );
    }

    // ─── UTM / attribution ────────────────────────────────────────────────────
    const referrer = request.headers.get("referer") ?? null;
    const utm = (quizAnswers ?? {}) as Record<string, unknown>;

    const supabase = getServiceSupabase();

    // Upsert lead (update if email exists)
    const { data, error } = await supabase
      .from("leads")
      .upsert(
        {
          first_name: firstName,
          email,
          quiz_answers: quizAnswers,
          utm_source: (utm.utm_source as string) ?? null,
          utm_medium: (utm.utm_medium as string) ?? null,
          utm_campaign: (utm.utm_campaign as string) ?? null,
          utm_content: (utm.utm_content as string) ?? null,
          referrer_url: referrer,
        },
        { onConflict: "email" }
      )
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to save lead" },
        { status: 500 }
      );
    }

    // ─── AI Qualification (FDA criteria) ──────────────────────────────────────
    // Fire-and-forget — the agent persists its own result to the lead record
    // via its audit-logged path. We don't block the HTTP response on Claude.
    if (process.env.ANTHROPIC_API_KEY) {
      void QualificationAgent.qualify({
        leadId: data.id as string,
        firstName,
        email,
        quizAnswers: (quizAnswers ?? {}) as Record<string, unknown>,
      }).catch((err) => {
        console.error("[QualificationAgent] async error:", err);
      });
    }

    // Send welcome email (don't block on AI)
    try {
      await getResend().emails.send({
        from: "SlimRx <noreply@slimrx.com>",
        to: email,
        subject: `${firstName}, your personalized plan is ready!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #0A1628;">Hi ${firstName}!</h1>
            <p>Great news — we're preparing your personalized plan. A licensed provider will review your information to confirm eligibility for our Doctor-Guided GLP-1 program.</p>
            <p>In the meantime, choose the plan that fits you best and start your journey today.</p>
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/checkout" style="display: inline-block; background: #00D4B4; color: #0A1628; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">View My Plan</a>
            <p style="margin-top: 24px; color: #6B7280; font-size: 14px;">— The SlimRx Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Email send error:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ success: true, leadId: data.id });
  } catch (err) {
    console.error("Leads API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
