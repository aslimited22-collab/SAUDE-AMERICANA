import { LegalLayout } from "@/components/legal-layout";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Medical Consent" };

export default function MedicalConsentPage() {
  return (
    <LegalLayout title="Medical Consent for Telehealth Services" updated="April 2026">
      <h2>Purpose</h2>
      <p>
        This document describes your consent to receive telehealth services through SlimRx. By using
        our services, you acknowledge that you have read, understood, and agree to the following terms.
      </p>

      <h2>Nature of Telehealth</h2>
      <p>
        Telehealth involves the delivery of healthcare services using electronic communications,
        information technology, or other means between a patient and a healthcare provider who are
        not in the same physical location. This may include assessment, diagnosis, consultation,
        treatment, education, care management, and self-management.
      </p>

      <h2>Benefits and Risks</h2>
      <p>
        <strong>Benefits:</strong> Improved access to medical care, convenience, reduced travel time,
        and the ability to receive care from the comfort of your home.
      </p>
      <p>
        <strong>Risks:</strong> As with any medical service, there are potential risks including, but
        not limited to: limitations of technology, the possibility that the provider may not have access
        to all of your medical records, the potential for technical difficulties, and the inability to
        perform a physical examination.
      </p>

      <h2>Medication Risks</h2>
      <p>
        GLP-1 receptor agonist medications (such as semaglutide and tirzepatide) may cause side effects
        including but not limited to: nausea, vomiting, diarrhea, constipation, abdominal pain, headache,
        fatigue, dizziness, injection site reactions, and in rare cases, pancreatitis, gallbladder problems,
        kidney issues, or allergic reactions. Your provider will discuss these risks with you in detail.
      </p>

      <h2>Your Rights</h2>
      <ul>
        <li>You have the right to refuse or withdraw consent to telehealth services at any time.</li>
        <li>You have the right to ask questions about any aspect of your care.</li>
        <li>Your health information will be treated confidentially under HIPAA regulations.</li>
        <li>You may request copies of your medical records at any time.</li>
        <li>Withdrawal of consent will not affect your right to future care or treatment.</li>
      </ul>

      <h2>Patient Responsibilities</h2>
      <ul>
        <li>Provide accurate and complete health information.</li>
        <li>Inform your provider of all current medications and supplements.</li>
        <li>Follow the prescribed treatment plan and report any adverse effects promptly.</li>
        <li>Maintain a relationship with a primary care physician for comprehensive care.</li>
        <li>Seek emergency care if you experience a medical emergency.</li>
      </ul>

      <h2>Contact</h2>
      <p>
        If you have questions about this consent or your care, contact us at{" "}
        <a href="mailto:medical@slimrx.com">medical@slimrx.com</a> or (800) 555-0199.
      </p>
    </LegalLayout>
  );
}
