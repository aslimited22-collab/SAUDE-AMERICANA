import { LegalLayout } from "@/components/legal-layout";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cancellation & Refund Policy" };

export default function RefundPage() {
  return (
    <LegalLayout title="Cancellation & Refund Policy" updated="April 2026">
      <h2>30-Day Money-Back Guarantee</h2>
      <p>
        SlimRx offers a 30-day money-back guarantee for new subscribers. If you are not satisfied
        with your program within the first 30 days of enrollment, you may request a full refund of
        your first month&apos;s subscription payment.
      </p>

      <h2>How to Request a Refund</h2>
      <p>
        To request a refund, contact our support team at{" "}
        <a href="mailto:support@slimrx.com">support@slimrx.com</a> or call (800) 555-0199 within
        30 days of your initial payment. Include your account email and reason for the request.
        Refunds are typically processed within 5–10 business days.
      </p>

      <h2>Subscription Cancellation</h2>
      <p>
        You may cancel your subscription at any time with no penalties. Cancellation takes effect at
        the end of your current billing cycle — you will continue to have access to your plan until
        that date. No partial-month refunds are issued for cancellations made after the 30-day
        guarantee period.
      </p>

      <h2>Medication Already Shipped</h2>
      <p>
        If medication has already been shipped or dispensed, refunds may be prorated or subject to
        a restocking fee as determined by the fulfilling pharmacy. For safety reasons, we cannot
        accept returned medications.
      </p>

      <h2>Exceptions</h2>
      <p>
        Refund requests may be denied if there is evidence of fraud, abuse of the guarantee, or if
        you have already received and used medication beyond the initial evaluation period. All
        refund decisions are made at SlimRx&apos;s discretion.
      </p>

      <h2>Contact</h2>
      <p>
        For billing or refund questions, email{" "}
        <a href="mailto:billing@slimrx.com">billing@slimrx.com</a> or call (800) 555-0199.
      </p>
    </LegalLayout>
  );
}
