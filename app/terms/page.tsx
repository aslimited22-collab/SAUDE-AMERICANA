import { LegalLayout } from "@/components/legal-layout";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <LegalLayout title="Terms & Conditions" updated="April 2026">
      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using the SlimRx website and services, you agree to be bound by these Terms
        and Conditions. If you do not agree, do not use our services. SlimRx reserves the right to
        modify these terms at any time.
      </p>

      <h2>2. Description of Services</h2>
      <p>
        SlimRx provides an online telehealth platform that connects patients with licensed healthcare
        providers for the purpose of evaluating, diagnosing, and treating conditions related to weight
        management, including the prescription of GLP-1 receptor agonist medications. SlimRx is not a
        pharmacy, insurer, or direct healthcare provider.
      </p>

      <h2>3. Eligibility</h2>
      <p>
        You must be at least 18 years of age, a resident of the United States, and legally capable of
        entering into a binding agreement. You must provide accurate and complete health information.
        Providing false information may result in termination of services.
      </p>

      <h2>4. Medical Disclaimer</h2>
      <p>
        SlimRx facilitates access to licensed medical providers but does not itself practice medicine.
        All medical decisions, including prescriptions, are made by independent licensed physicians.
        Our platform does not guarantee any specific medical outcome. Individual results vary.
      </p>

      <h2>5. Subscription & Payment</h2>
      <p>
        By subscribing to a SlimRx plan, you authorize us to charge your payment method on a recurring
        monthly basis. All prices are in USD. You may cancel your subscription at any time through your
        account or by contacting support. Cancellation takes effect at the end of your current billing cycle.
      </p>

      <h2>6. Refund Policy</h2>
      <p>
        Please refer to our separate <a href="/refund">Cancellation & Refund Policy</a> for details
        regarding refunds and our 30-day money-back guarantee.
      </p>

      <h2>7. User Conduct</h2>
      <p>
        You agree not to misuse the platform, provide false health information, share your account
        credentials, or use our services for any unlawful purpose. SlimRx reserves the right to
        terminate accounts that violate these terms.
      </p>

      <h2>8. Intellectual Property</h2>
      <p>
        All content on the SlimRx website — including text, graphics, logos, and software — is the
        property of SlimRx and is protected by copyright and trademark laws. You may not reproduce,
        distribute, or create derivative works without our written permission.
      </p>

      <h2>9. Limitation of Liability</h2>
      <p>
        To the fullest extent permitted by law, SlimRx and its affiliates shall not be liable for any
        indirect, incidental, special, consequential, or punitive damages arising from your use of our
        services. Our total liability shall not exceed the amount paid by you in the twelve months
        preceding the claim.
      </p>

      <h2>10. Governing Law</h2>
      <p>
        These terms shall be governed by the laws of the State of Delaware, without regard to conflict
        of law principles. Any disputes shall be resolved in the courts of Delaware.
      </p>

      <h2>11. Contact</h2>
      <p>
        For questions regarding these Terms & Conditions, contact us at{" "}
        <a href="mailto:legal@slimrx.com">legal@slimrx.com</a> or (800) 555-0199.
      </p>
    </LegalLayout>
  );
}
