"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  CreditCard,
  Truck,
  MessageSquare,
  BookOpen,
  LogOut,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { NavBar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { getSupabase } from "@/lib/supabase";

interface DashboardData {
  firstName: string;
  email: string;
  plan: string | null;
  subscriptionStatus: string | null;
  currentMonth: number | null;
  hasIntake: boolean;
  intakeReviewed: boolean;
  prescriptionSent: boolean;
  prescriptionShipped: boolean;
  trackingNumber: string | null;
  nextRenewal: string | null;
}

const statusPill = (status: string | null) => {
  if (!status) return "bg-gray-100 text-gray-600";
  if (status === "active") return "bg-green-100 text-green-700";
  if (status === "past_due") return "bg-amber-100 text-amber-700";
  if (status === "paused") return "bg-blue-100 text-blue-700";
  if (status === "canceled") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
};

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login?next=/dashboard");
        return;
      }
      const res = await fetch("/api/patient/me", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        setData(await res.json());
      } else if (res.status === 404) {
        router.replace("/intake");
        return;
      }
      setLoading(false);
    })();
  }, [router]);

  async function signOut() {
    await getSupabase().auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <>
        <NavBar />
        <main className="flex-1">
          <Section className="bg-brand-gray">
            <Container>
              <p className="text-center text-brand-gray-dark">Loading your dashboard…</p>
            </Container>
          </Section>
        </main>
        <Footer />
      </>
    );
  }

  if (!data) return null;

  const steps: { label: string; done: boolean; icon: React.ElementType; href?: string }[] = [
    { label: "Payment completed", done: !!data.plan, icon: CreditCard },
    {
      label: "Medical intake submitted",
      done: data.hasIntake,
      icon: ClipboardList,
      href: data.hasIntake ? undefined : "/medical-intake",
    },
    {
      label: "Provider review",
      done: data.intakeReviewed,
      icon: CheckCircle2,
    },
    {
      label: "Prescription sent to pharmacy",
      done: data.prescriptionSent,
      icon: MessageSquare,
    },
    {
      label: "Medication shipped",
      done: data.prescriptionShipped,
      icon: Truck,
    },
  ];

  return (
    <>
      <NavBar />
      <main className="flex-1">
        <Section className="bg-brand-gray">
          <Container>
            <div className="mx-auto max-w-4xl">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-heading text-3xl font-bold text-brand-navy">
                    Welcome back, {data.firstName}
                  </h1>
                  <p className="text-sm text-brand-gray-dark">{data.email}</p>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 text-sm text-brand-gray-dark hover:text-brand-navy"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </div>

              {/* Plan banner */}
              <div className="mt-6 rounded-2xl bg-gradient-to-br from-brand-navy to-[#0f2440] p-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-brand-teal-light">Your plan</p>
                    <p className="mt-1 text-2xl font-bold capitalize">
                      {data.plan ?? "No plan yet"}
                    </p>
                    {data.subscriptionStatus && (
                      <span
                        className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPill(
                          data.subscriptionStatus
                        )}`}
                      >
                        {data.subscriptionStatus}
                      </span>
                    )}
                  </div>
                  {data.currentMonth !== null && (
                    <div className="text-right">
                      <p className="text-sm text-brand-teal-light">Month</p>
                      <p className="text-3xl font-bold">{data.currentMonth} / 9</p>
                    </div>
                  )}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href="/billing"
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
                  >
                    Manage billing →
                  </Link>
                  <Link
                    href="/instructions"
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
                  >
                    Medication guide →
                  </Link>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
                <h2 className="font-heading text-lg font-bold text-brand-navy">
                  Your progress
                </h2>
                <ol className="mt-4 space-y-4">
                  {steps.map((step) => (
                    <li key={step.label} className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${
                          step.done
                            ? "bg-brand-teal text-white"
                            : "bg-brand-gray text-brand-gray-dark"
                        }`}
                      >
                        {step.done ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <Clock className="size-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p
                          className={
                            step.done
                              ? "font-semibold text-brand-navy"
                              : "text-brand-gray-dark"
                          }
                        >
                          {step.label}
                        </p>
                        {step.href && (
                          <Link
                            href={step.href}
                            className="mt-1 inline-flex items-center gap-1 text-sm text-brand-teal hover:text-brand-teal-dark"
                          >
                            Continue <ArrowRight className="size-3.5" />
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>

                {data.trackingNumber && (
                  <div className="mt-5 rounded-lg bg-brand-teal-light/40 p-4 text-sm">
                    <p className="font-medium text-brand-navy">Tracking number</p>
                    <p className="text-brand-gray-dark">{data.trackingNumber}</p>
                  </div>
                )}
              </div>

              {/* Quick links */}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <QuickCard
                  href="/instructions"
                  icon={<BookOpen className="size-5" />}
                  title="Medication guide"
                  body="How to inject, storage, side effects, and when to call."
                />
                <QuickCard
                  href="/billing"
                  icon={<CreditCard className="size-5" />}
                  title="Billing"
                  body="Update payment method, pause, cancel, or view invoices."
                />
              </div>

              {/* Support */}
              <div className="mt-6 rounded-2xl bg-brand-teal-light/30 p-5 text-sm text-brand-navy">
                <p className="font-medium">Need help?</p>
                <p className="mt-1">
                  Text{" "}
                  <a
                    href={`sms:${process.env.NEXT_PUBLIC_SUPPORT_SMS ?? "+18005550100"}`}
                    className="underline"
                  >
                    {process.env.NEXT_PUBLIC_SUPPORT_SMS ?? "(800) 555-0100"}
                  </a>{" "}
                  — our care team replies 7 days a week.
                </p>
              </div>
            </div>
          </Container>
        </Section>
      </main>
      <Footer />
    </>
  );
}

function QuickCard({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-brand-teal-light text-brand-teal-dark">
        {icon}
      </div>
      <h3 className="mt-3 font-heading text-base font-bold text-brand-navy group-hover:text-brand-teal-dark">
        {title}
      </h3>
      <p className="mt-1 text-sm text-brand-gray-dark">{body}</p>
    </Link>
  );
}
