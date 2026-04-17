"use client";

import { getSupabase } from "@/lib/supabase";

// Fetch wrapper for /api/admin/* — attaches Supabase access token and the
// x-admin-session flag. Redirects the caller to /admin/login on 401.
export async function adminFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const supabase = getSupabase();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { ok: false, status: 401, error: "Not signed in" };
  }

  const headers = new Headers(init.headers ?? {});
  headers.set("Authorization", `Bearer ${session.access_token}`);
  headers.set("x-admin-session", "1");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const res = await fetch(path, { ...init, headers });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return {
        ok: false,
        status: res.status,
        error: (errBody as { error?: string })?.error ?? res.statusText,
      };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
