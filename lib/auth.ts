import { getServiceSupabase, getSupabase } from "@/lib/supabase";

export type AuthResult =
  | { ok: true; email?: string; userId?: string; source: "token" | "supabase" | "dev" }
  | { ok: false; status: number; error: string };

// ─── Admin auth ──────────────────────────────────────────────────────────────
// Accepts either:
//   - Static bearer ADMIN_API_TOKEN (used by cron and internal calls)
//   - Supabase JWT bearer + header `x-admin-session: 1`, where the user's email
//     matches ADMIN_EMAIL (set in environment).
export async function requireAdminAuth(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization") ?? "";
  const adminToken = process.env.ADMIN_API_TOKEN;
  const adminEmail = process.env.ADMIN_EMAIL;
  const hasAdminSession = request.headers.get("x-admin-session") === "1";

  // 1. Static token path
  if (adminToken && authHeader === `Bearer ${adminToken}`) {
    return { ok: true, source: "token" };
  }

  // 2. Supabase session path
  if (hasAdminSession && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        return { ok: false, status: 401, error: "Invalid session" };
      }
      if (adminEmail && data.user.email !== adminEmail) {
        return { ok: false, status: 403, error: "Not an admin" };
      }
      return {
        ok: true,
        email: data.user.email ?? undefined,
        userId: data.user.id,
        source: "supabase",
      };
    } catch (err) {
      console.error("[auth] Supabase session validation failed:", err);
      return { ok: false, status: 401, error: "Session validation failed" };
    }
  }

  // 3. Dev fallback
  if (!adminToken && process.env.NODE_ENV === "development") {
    return { ok: true, source: "dev" };
  }

  return { ok: false, status: 401, error: "Unauthorized" };
}

// ─── Patient auth ────────────────────────────────────────────────────────────
// Used by the patient dashboard. Validates Supabase JWT and returns the
// associated lead_id (looked up via email match). Anonymous access is rejected.
export interface PatientAuthOk {
  ok: true;
  userId: string;
  email: string;
  leadId: string;
}

export type PatientAuthResult = PatientAuthOk | { ok: false; status: number; error: string };

export async function requirePatientAuth(request: Request): Promise<PatientAuthResult> {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing bearer token" };
  }

  const token = authHeader.slice("Bearer ".length);
  try {
    const anon = getSupabase();
    const { data, error } = await anon.auth.getUser(token);
    if (error || !data?.user?.email) {
      return { ok: false, status: 401, error: "Invalid session" };
    }

    const service = getServiceSupabase();
    const { data: lead } = await service
      .from("leads")
      .select("id")
      .eq("email", data.user.email)
      .maybeSingle();

    if (!lead) {
      return { ok: false, status: 404, error: "No patient record for this account" };
    }

    return {
      ok: true,
      userId: data.user.id,
      email: data.user.email,
      leadId: lead.id as string,
    };
  } catch (err) {
    console.error("[auth] patient validation failed:", err);
    return { ok: false, status: 401, error: "Session validation failed" };
  }
}
