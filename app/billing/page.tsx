"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, ArrowRight, ShieldCheck, AlertCircle, LogOut } from "lucide-react";
import { NavBar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { getSupabase } from "@/lib/supabase";

interface SubscriptionInfo {
  plan: string | null;
  status: string | null;
  currentMonth: number | null;
  lastPaymentAt: string | null;
  nextRenewal: string | null;
}

export default function BillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabase();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login?next=/billing");
          return;
        }

        setEmail(session.user.email ?? null);

        const res = await fetch("/api/patient/subscription", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (res.ok) {
          setSub(await res.json());
        } else if (res.status === 404) {
          setError("No subscription found. Complete checkout to activate your plan.");
        } else {
          setError("Unable to load billing info.");
        }
      } catch (err) {
        console.error(err);
        setError("Unable to load billing info.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const supabase = getSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?next=/billing");
        return;
      }

      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      const json = await res.json();
      if (res.ok && json.url) {
        window.location.href = json.url;
      } else {
        setError(json.error || "Unable to open billing portal.");
      }
    } catch {
      setError("Unable to open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function signOut() {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <>
      <NavBar />
      <main className="flex-1">
        <Section className="bg-brand-gray">
          <Container>
            <div className="mx-auto max-w-2xl">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="font-heading text-3xl font-bold text-brand-navy">
                    Billing &amp; Subscription
                  </h1>
                  {email && (
                    <p className="text-sm text-brand-gray-dark">
                      Signed in as <strong>{email}</strong>
                    </p>
                  )}
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 text-sm text-brand-gray-dark hover:text-brand-navy"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>

              {loading ? (
                <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                  <p className="text-brand-gray-dark">Loading your billing info…</p>
                </div>
              ) : error ? (
                <div className="rounded-2xl bg-white p-8 shadow-sm">
                  <div className="flex gap-3 rounded-lg bg-amber-50 p-4 text-amber-800">
                    <AlertCircle className="size-5 shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <Link href="/checkout">
                      <Button variant="primary">Complete checkout</Button>
                    </Link>
                    <Link href="/dashboard">
                      <Button variant="secondary">Back to dashboard</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Plan summary */}
                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="size-5 text-brand-teal" />
                          <span className="text-sm font-medium text-brand-gray-dark">
                            Current plan
                          </span>
                        </div>
                        <p className="mt-2 text-2xl font-bold capitalize text-brand-navy">
                          {sub?.plan ?? "—"}
                        </p>
                        <p className="mt-1 text-sm text-brand-gray-dark">
                          Status:{" "}
                          <span
                            className={`font-medium ${
                              sub?.status === "active"
                                ? "text-green-600"
                                : sub?.status === "past_due"
                                ? "text-amber-600"
                                : sub?.status === "canceled"
                                ? "text-red-600"
                                : "text-brand-gray-dark"
                            }`}
                          >
                            {sub?.status ?? "—"}
                          </span>
                        </p>
                      </div>
                      {sub?.currentMonth && (
                        <div className="text-right">
                          <p className="text-xs text-brand-gray-dark">Treatment month</p>
                          <p className="text-lg font-bold text-brand-navy">
                            {sub.currentMonth} / 9
                          </p>
                        </div>
                      )}
                    </div>
                    <hr className="my-5 border-brand-gray" />
                    <div className="grid gap-4 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-brand-gray-dark">Last payment</p>
                        <p className="font-medium text-brand-navy">
                          {sub?.lastPaymentAt
                            ? new Date(sub.lastPaymentAt).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-brand-gray-dark">Next renewal</p>
                        <p className="font-medium text-brand-navy">
                          {sub?.nextRenewal
                            ? new Date(sub.nextRenewal).toLocaleDateString()
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-brand-navy">
                      Manage subscription
                    </h2>
                    <p className="mt-1 text-sm text-brand-gray-dark">
                      Update payment method, view invoices, pause, or cancel your plan
                      through Stripe&apos;s secure billing portal.
                    </p>
                    <Button
                      variant="primary"
                      className="mt-4 w-full sm:w-auto"
                      onClick={openPortal}
                      disabled={portalLoading}
                    >
                      {portalLoading ? "Opening…" : "Open Billing Portal"}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </div>

                  {/* Security note */}
                  <div className="flex gap-3 rounded-lg bg-brand-teal-light/50 p-4 text-sm text-brand-navy">
                    <ShieldCheck className="size-5 shrink-0 text-brand-teal-dark" />
                    <p>
                      Your payment information is handled directly by Stripe. SlimRx
                      never stores card numbers.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}
