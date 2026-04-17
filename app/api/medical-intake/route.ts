import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { getResend } from "@/lib/resend";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      personalInfo,
      medications,
      allergies,
      medicalConditions,
      vitals,
      weightLossHistory,
      consentSigned,
      signatureName,
    } = body;

    if (!email || !consentSigned || !signatureName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();

    // Find the lead by email
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("email", email)
      .single();

    if (!lead) {
      return NextResponse.json(
        { error: "No matching patient record found" },
        { status: 404 }
      );
    }

    // Insert medical intake
    const { error } = await supabase.from("medical_intakes").insert({
      lead_id: lead.id,
      personal_info: personalInfo,
      medications,
      allergies,
      medical_conditions: medicalConditions,
      vitals,
      weight_loss_history: weightLossHistory,
      consent_signed: consentSigned,
      signature_name: signatureName,
    });

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Failed to save medical intake" },
        { status: 500 }
      );
    }

    // Notify admin
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        const resend = getResend();
        await resend.emails.send({
          from: "SlimRx <noreply@slimrx.com>",
          to: adminEmail,
          subject: `New Medical Intake: ${personalInfo?.fullName || email}`,
          html: `
            <div style="font-family: sans-serif;">
              <h2>New Medical Intake Submitted</h2>
              <p><strong>Patient:</strong> ${personalInfo?.fullName || "N/A"}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${personalInfo?.phone || "N/A"}</p>
              <p>Please review in the admin dashboard.</p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      console.error("Admin notification error:", emailError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Medical intake error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
