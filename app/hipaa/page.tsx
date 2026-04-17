import { LegalLayout } from "@/components/legal-layout";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "HIPAA Notice of Privacy Practices" };

export default function HipaaPage() {
  return (
    <LegalLayout title="HIPAA Notice of Privacy Practices" updated="April 2026">
      <p>
        <strong>THIS NOTICE DESCRIBES HOW MEDICAL INFORMATION ABOUT YOU MAY BE USED AND
        DISCLOSED AND HOW YOU CAN GET ACCESS TO THIS INFORMATION. PLEASE REVIEW IT CAREFULLY.</strong>
      </p>

      <h2>Our Commitment</h2>
      <p>
        SlimRx is committed to protecting the privacy of your protected health information (PHI) in
        accordance with the Health Insurance Portability and Accountability Act of 1996 (HIPAA) and
        applicable state laws. This notice describes our privacy practices and your rights regarding
        your PHI.
      </p>

      <h2>How We May Use and Disclose Your PHI</h2>
      <ul>
        <li><strong>Treatment:</strong> We may use and share your PHI with healthcare providers involved in your care, including prescribing physicians and pharmacies.</li>
        <li><strong>Payment:</strong> We may use your PHI for billing and payment purposes, including sharing information with your insurance provider if applicable.</li>
        <li><strong>Healthcare Operations:</strong> We may use your PHI for quality improvement, training, and other operational activities.</li>
        <li><strong>As Required by Law:</strong> We may disclose your PHI when required by federal, state, or local law.</li>
        <li><strong>Public Health:</strong> We may disclose PHI for public health activities such as reporting adverse drug reactions.</li>
      </ul>

      <h2>Uses Requiring Your Authorization</h2>
      <p>
        We will obtain your written authorization before using or disclosing your PHI for purposes
        not described in this notice, including marketing, sale of PHI, and most uses of psychotherapy
        notes. You may revoke your authorization in writing at any time.
      </p>

      <h2>Your Rights</h2>
      <ul>
        <li><strong>Right to Access:</strong> You may request access to your medical records. We will respond within 30 days.</li>
        <li><strong>Right to Amend:</strong> You may request corrections to your PHI if you believe it contains errors.</li>
        <li><strong>Right to an Accounting of Disclosures:</strong> You may request a list of instances where we shared your PHI.</li>
        <li><strong>Right to Restrict:</strong> You may request restrictions on certain uses and disclosures of your PHI.</li>
        <li><strong>Right to Confidential Communications:</strong> You may request that we communicate with you in a particular way or at a specific location.</li>
        <li><strong>Right to a Copy of This Notice:</strong> You may request a paper copy of this notice at any time.</li>
      </ul>

      <h2>Our Duties</h2>
      <ul>
        <li>We are required by law to maintain the privacy and security of your PHI.</li>
        <li>We must notify you promptly if a breach occurs that may have compromised your PHI.</li>
        <li>We must follow the terms of this notice currently in effect.</li>
        <li>We will not use or disclose your PHI without your authorization except as described in this notice.</li>
      </ul>

      <h2>Complaints</h2>
      <p>
        If you believe your privacy rights have been violated, you may file a complaint with our
        Privacy Officer at <a href="mailto:privacy@slimrx.com">privacy@slimrx.com</a> or with the
        U.S. Department of Health and Human Services Office for Civil Rights. We will not retaliate
        against you for filing a complaint.
      </p>

      <h2>Contact Our Privacy Officer</h2>
      <p>
        SlimRx Privacy Officer<br />
        Email: <a href="mailto:privacy@slimrx.com">privacy@slimrx.com</a><br />
        Phone: (800) 555-0199
      </p>
    </LegalLayout>
  );
}
