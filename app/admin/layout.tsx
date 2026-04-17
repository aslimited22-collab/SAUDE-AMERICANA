"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  CreditCard,
  ClipboardList,
  BarChart3,
  LogOut,
  Mail,
  Loader2,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { getSupabase } from "@/lib/supabase";

const navItems = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/leads", label: "Leads", icon: Users },
  { href: "/admin/patients", label: "Patients", icon: CreditCard },
  { href: "/admin/intakes", label: "Intakes", icon: ClipboardList },
];

type AuthState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden"; email: string }
  | { status: "authenticated"; email: string };

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({ status: "loading" });
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session?.user?.email) {
        setAuthState({ status: "unauthenticated" });
        return;
      }

      if (adminEmail && session.user.email !== adminEmail) {
        setAuthState({ status: "forbidden", email: session.user.email });
        return;
      }

      setAuthState({ status: "authenticated", email: session.user.email });
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user?.email) {
        setAuthState({ status: "unauthenticated" });
        return;
      }
      if (adminEmail && session.user.email !== adminEmail) {
        setAuthState({ status: "forbidden", email: session.user.email });
        return;
      }
      setAuthState({ status: "authenticated", email: session.user.email });
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [adminEmail]);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email) return;
    setSending(true);
    try {
      const supabase = getSupabase();
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${pathname}`,
        },
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send link");
    } finally {
      setSending(false);
    }
  }

  async function signOut() {
    await getSupabase().auth.signOut();
    setAuthState({ status: "unauthenticated" });
    router.refresh();
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (authState.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-gray">
        <Loader2 className="size-6 animate-spin text-brand-gray-dark" />
      </div>
    );
  }

  // ── Forbidden (signed in as non-admin) ────────────────────────────────────
  if (authState.status === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-gray p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg text-center">
          <h1 className="text-xl font-bold text-brand-navy">Access denied</h1>
          <p className="mt-2 text-sm text-brand-gray-dark">
            <strong>{authState.email}</strong> is not an admin account.
          </p>
          <button
            onClick={signOut}
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-brand-navy font-semibold text-white hover:bg-[#0f2440]"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </div>
    );
  }

  // ── Login form ────────────────────────────────────────────────────────────
  if (authState.status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-gray p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="text-center text-2xl font-bold text-brand-navy">
            Admin Login
          </h1>
          <p className="mt-1 text-center text-sm text-brand-gray-dark">
            Magic link sign-in
          </p>

          {sent ? (
            <div className="mt-6 rounded-lg bg-green-50 p-4 text-sm text-green-800">
              Check <strong>{email}</strong> for your secure sign-in link.
            </div>
          ) : (
            <form onSubmit={sendMagicLink} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-brand-navy">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-brand-gray-dark" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@slimrx.com"
                    className="w-full rounded-xl border-2 border-gray-200 p-3 pl-9 outline-none focus:border-brand-teal"
                  />
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={sending || !email}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-brand-teal font-semibold text-brand-navy transition-colors hover:bg-brand-teal-dark disabled:opacity-60"
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" /> Sending…
                  </>
                ) : (
                  "Send magic link"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ── Authenticated ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-brand-gray">
      <header className="border-b bg-white">
        <Container>
          <div className="flex h-14 items-center justify-between">
            <Link href="/admin" className="text-lg font-bold text-brand-navy">
              Slim<span className="text-brand-teal">Rx</span>{" "}
              <span className="text-sm font-normal text-brand-gray-dark">Admin</span>
            </Link>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-brand-gray-dark sm:inline">
                {authState.email}
              </span>
              <button
                onClick={signOut}
                className="flex items-center gap-1.5 text-sm text-brand-gray-dark hover:text-brand-navy"
              >
                <LogOut className="size-4" /> Logout
              </button>
            </div>
          </div>
        </Container>
      </header>

      <Container>
        <div className="flex gap-6 py-6">
          <nav className="hidden w-48 shrink-0 md:block">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-brand-teal-light text-brand-navy"
                      : "text-brand-gray-dark hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
          <main className="flex-1">{children}</main>
        </div>
      </Container>
    </div>
  );
}
