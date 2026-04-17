"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Check,
  CreditCard,
  ClipboardList,
  UserCheck,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const PLANS: Record<
  string,
  { name: string; price: number; features: string[] }
> = {
  starter: {
    name: "Starter Plan",
    price: 197,
    features: [
      "GLP-1 medication included",
      "Monthly provider check-in",
      "Email support",
    ],
  },
  popular: {
    name: "Most Popular Plan",
    price: 297,
    features: [
      "GLP-1 medication included",
      "Bi-weekly provider check-in",
      "Priority 24/7 support",
      "Patient portal access",
      "Weight loss guarantee",
    ],
  },
  premium: {
    name: "Premium Plan",
    price: 397,
    features: [
      "GLP-1 medication included",
      "Weekly provider check-in",
      "Priority 24/7 support",
      "Patient portal access",
      "Dedicated care coach",
      "Nutrition guidance",
      "Weight loss guarantee",
    ],
  },
};

const timeline = [
  { icon: CreditCard, label: "Complete payment" },
  { icon: ClipboardList, label: "Complete medical intake (redirected after)" },
  { icon: UserCheck, label: "Provider reviews your case (24–48h)" },
  { icon: Truck, label: "Prescription issued & shipped" },
];

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><p className="text-brand-gray-dark">Loading...</p></div>}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const planSlug = searchParams.get("plan") || "popular";
  const plan = PLANS[planSlug] || PLANS.popular;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planSlug, email, name }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-gray">
      {/* Header */}
      <header className="border-b bg-white">
        <Container>
          <div className="flex h-14 items-center justify-between">
            <Link href="/" className="text-lg font-bold text-brand-navy">
              Slim<span className="text-brand-teal">Rx</span>
            </Link>
            <div className="flex items-center gap-2 text-xs text-brand-gray-dark">
              <Shield className="size-3.5 text-brand-teal" />
              Secure Checkout
            </div>
          </div>
        </Container>
      </header>

      <Container className="py-12">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left — Order Summary */}
          <div className="rounded-2xl bg-white p-6 shadow-md md:p-8">
            <h2 className="text-xl font-bold text-brand-navy">
              Order Summary
            </h2>
            <div className="mt-4 flex items-baseline justify-between border-b pb-4">
              <span className="font-semibold text-brand-navy">{plan.name}</span>
              <span className="text-2xl font-bold text-brand-navy">
                ${plan.price}
                <span className="text-sm font-normal text-brand-gray-dark">
                  /mo
                </span>
              </span>
            </div>
            <ul className="mt-4 space-y-2">
              {plan.features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-brand-gray-dark"
                >
                  <Check className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <h3 className="text-sm font-semibold text-brand-navy">
                What happens next
              </h3>
              <ol className="mt-3 space-y-3">
                {timeline.map((item, i) => (
                  <li
                    key={item.label}
                    className="flex items-start gap-3 text-sm text-brand-gray-dark"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-teal-light">
                      <item.icon className="size-3.5 text-brand-teal-dark" />
                    </div>
                    <span>
                      <strong className="text-brand-navy">
                        Step {i + 1}:
                      </strong>{" "}
                      {item.label}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Right — Payment Form */}
          <div className="rounded-2xl bg-white p-6 shadow-md md:p-8">
            <h2 className="text-xl font-bold text-brand-navy">
              Payment Details
            </h2>
            <p className="mt-1 text-sm text-brand-gray-dark">
              You&apos;ll be redirected to our secure payment processor.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-brand-navy">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full rounded-xl border-2 border-gray-200 p-3 text-brand-navy outline-none focus:border-brand-teal"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-brand-navy">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full rounded-xl border-2 border-gray-200 p-3 text-brand-navy outline-none focus:border-brand-teal"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="h-12 w-full text-base"
                disabled={loading}
              >
                {loading
                  ? "Redirecting to payment..."
                  : `Start My Program — $${plan.price}/month`}
              </Button>

              <p className="flex items-center justify-center gap-2 text-xs text-brand-gray-dark">
                <Shield className="size-3.5 text-brand-teal" />
                256-bit SSL encrypted &bull; Cancel anytime
              </p>
            </form>
          </div>
        </div>
      </Container>
    </div>
  );
}
