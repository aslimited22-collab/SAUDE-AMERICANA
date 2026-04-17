import { LegalLayout } from "@/components/legal-layout";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="April 2026">
      <h2>1. Introduction</h2>
      <p>
        SlimRx (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) is committed to protecting your
        privacy. This Privacy Policy describes how we collect, use, disclose, and safeguard your
        personal and health information when you use our website and telehealth services.
      </p>

      <h2>2. Information We Collect</h2>
      <p>We may collect the following types of information:</p>
      <ul>
        <li><strong>Personal information:</strong> name, email address, phone number, date of birth, mailing address.</li>
        <li><strong>Health information:</strong> medical history, current medications, allergies, vitals, weight, and treatment responses.</li>
        <li><strong>Payment information:</strong> credit/debit card details (processed securely via Stripe; we do not store card numbers).</li>
        <li><strong>Usage data:</strong> IP address, browser type, pages visited, and interaction data collected via cookies and analytics.</li>
      </ul>

      <h2>3. How We Use Your Information</h2>
      <ul>
        <li>To provide and facilitate telehealth services and prescriptions.</li>
        <li>To communicate with you about your treatment, account, and billing.</li>
        <li>To improve our services, website functionality, and user experience.</li>
        <li>To comply with legal obligations and regulatory requirements.</li>
        <li>To send you promotional communications (with your consent; you may opt out at any time).</li>
      </ul>

      <h2>4. HIPAA Compliance</h2>
      <p>
        Your protected health information (PHI) is handled in accordance with the Health Insurance
        Portability and Accountability Act (HIPAA). Please see our{" "}
        <a href="/hipaa">HIPAA Notice of Privacy Practices</a> for detailed information about
        your rights regarding your health information.
      </p>

      <h2>5. Information Sharing</h2>
      <p>We do not sell your personal information. We may share information with:</p>
      <ul>
        <li>Licensed healthcare providers who deliver your care.</li>
        <li>Licensed pharmacies that fulfill your prescriptions.</li>
        <li>Payment processors (Stripe) for billing purposes.</li>
        <li>Service providers who assist with email, hosting, and analytics.</li>
        <li>Law enforcement or regulatory bodies when required by law.</li>
      </ul>

      <h2>6. Data Security</h2>
      <p>
        We implement industry-standard security measures including 256-bit SSL encryption, encrypted
        databases, access controls, and regular security audits to protect your information.
      </p>

      <h2>7. Your Rights</h2>
      <p>
        You have the right to access, correct, or delete your personal information. You may also
        request a copy of your health records. To exercise these rights, contact us at{" "}
        <a href="mailto:privacy@slimrx.com">privacy@slimrx.com</a>.
      </p>

      <h2>8. Cookies</h2>
      <p>
        We use cookies and similar technologies for analytics and to improve your experience. You can
        manage cookie preferences through your browser settings.
      </p>

      <h2>9. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material changes
        via email or a notice on our website.
      </p>

      <h2>10. Contact</h2>
      <p>
        For privacy-related inquiries, contact us at{" "}
        <a href="mailto:privacy@slimrx.com">privacy@slimrx.com</a> or (800) 555-0199.
      </p>
    </LegalLayout>
  );
}
