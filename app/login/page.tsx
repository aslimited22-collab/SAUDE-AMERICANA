"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { NavBar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabase } from "@/lib/supabase";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If the user already has a valid session, bounce them to the destination
    (async () => {
      const supabase = getSupabase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) router.replace(next);
    })();
  }, [next, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) return;

    setLoading(true);
    try {
      const supabase = getSupabase();
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${next}`,
        },
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send login link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section className="bg-brand-gray">
      <Container>
        <div className="mx-auto max-w-md">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-brand-gray-dark hover:text-brand-navy"
          >
            <ArrowLeft className="size-4" />
            Back to home
          </Link>

          <div className="rounded-2xl bg-white p-8 shadow-sm">
            {sent ? (
              <div className="text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="size-8 text-green-600" />
                </div>
                <h1 className="mt-4 font-heading text-2xl font-bold text-brand-navy">
                  Check your email
                </h1>
                <p className="mt-2 text-brand-gray-dark">
                  We sent a secure login link to{" "}
                  <strong className="text-brand-navy">{email}</strong>. Click it
                  to access your dashboard.
                </p>
                <p className="mt-4 text-xs text-brand-gray-dark">
                  Didn&apos;t receive it? Check your spam folder, or{" "}
                  <button
                    onClick={() => setSent(false)}
                    className="text-brand-teal hover:underline"
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
            ) : (
              <>
                <h1 className="font-heading text-2xl font-bold text-brand-navy">
                  Sign in to SlimRx
                </h1>
                <p className="mt-1 text-sm text-brand-gray-dark">
                  We&apos;ll send a magic link to your email — no password
                  needed.
                </p>

                <form onSubmit={submit} className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <div className="relative mt-1">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-gray-dark" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    disabled={loading || !email}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Sending link…
                      </>
                    ) : (
                      "Send magic link"
                    )}
                  </Button>
                </form>

                <p className="mt-6 text-center text-xs text-brand-gray-dark">
                  By signing in, you agree to our{" "}
                  <Link href="/terms" className="underline hover:text-brand-navy">
                    Terms
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="underline hover:text-brand-navy">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-brand-gray-dark">
            New to SlimRx?{" "}
            <Link
              href="/intake"
              className="font-medium text-brand-teal-dark hover:underline"
            >
              Start your assessment
            </Link>
          </p>
        </div>
      </Container>
    </Section>
  );
}

export default function LoginPage() {
  return (
    <>
      <NavBar />
      <main className="flex-1">
        <Suspense
          fallback={
            <Section className="bg-brand-gray">
              <Container>
                <p className="text-center text-brand-gray-dark">Loading…</p>
              </Container>
            </Section>
          }
        >
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
