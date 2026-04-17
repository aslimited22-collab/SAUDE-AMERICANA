import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── In-Memory Rate Limiter ───────────────────────────────────────────────────
// For production scale, replace with Redis-backed limiter (Upstash)
interface RateEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateEntry>();

// Clean up expired entries periodically (every ~1000 requests)
let cleanupCounter = 0;
function cleanupStore() {
  cleanupCounter++;
  if (cleanupCounter % 1000 !== 0) return;
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) rateLimitStore.delete(key);
  }
}

function getRateLimitKey(req: NextRequest, scope: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return `${scope}:${ip}`;
}

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

function checkRateLimit(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs });
    return true; // allowed
  }

  if (entry.count >= config.max) return false; // blocked

  entry.count++;
  return true; // allowed
}

// ─── Rate Limit Configs ───────────────────────────────────────────────────────
const LIMITS = {
  // General API: 60 req/min
  api: { windowMs: 60_000, max: 60 },
  // Auth endpoints: 10 req/15min (brute-force protection)
  auth: { windowMs: 15 * 60_000, max: 10 },
  // Lead/intake submission: 5 req/15min per IP (spam protection)
  leads: { windowMs: 15 * 60_000, max: 5 },
  // Webhook endpoints: 200 req/min (Stripe/Twilio may burst)
  webhooks: { windowMs: 60_000, max: 200 },
  // Agent endpoints: 30 req/min (Claude API is expensive)
  agents: { windowMs: 60_000, max: 30 },
  // Support chat: 20 req/5min
  support: { windowMs: 5 * 60_000, max: 20 },
};

// ─── CORS Config ──────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  "https://slimrx.com",
  "https://www.slimrx.com",
  "https://app.slimrx.com",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin !== null && ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, stripe-signature, X-Twilio-Signature",
    "Access-Control-Max-Age": "86400",
    "Access-Control-Allow-Credentials": "false",
  };
}

// ─── Paths ────────────────────────────────────────────────────────────────────
function matchesPath(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname.startsWith(p));
}

// Admin routes that require auth token
const ADMIN_PATHS = ["/admin", "/api/admin"];
// Webhook paths bypass CORS (verified by signature instead)
const WEBHOOK_PATHS = ["/api/webhooks"];
// Agent API paths
const AGENT_PATHS = ["/api/agents"];
// Lead submission paths
const LEAD_PATHS = ["/api/leads", "/api/medical-intake", "/api/checkout"];

// ─── Admin Auth Check ─────────────────────────────────────────────────────────
// Accepts either:
//  1. Static ADMIN_API_TOKEN bearer (used by cron jobs, server-to-server)
//  2. Supabase access token + "x-admin-session: 1" (set by /admin client login)
// Final authorization is enforced inside each admin route, which re-validates
// the Supabase token and checks the user's email against ADMIN_EMAIL.
function isAdminAuthorized(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  const adminToken = process.env.ADMIN_API_TOKEN;
  const hasAdminSession = req.headers.get("x-admin-session") === "1";

  // Static token path (cron, internal)
  if (adminToken && authHeader === `Bearer ${adminToken}`) return true;

  // Supabase client path — token is present; downstream handler validates it
  if (hasAdminSession && authHeader?.startsWith("Bearer ")) return true;

  // Dev fallback: no token configured
  if (!adminToken && process.env.NODE_ENV === "development") return true;

  return false;
}

// ─── Proxy (Next.js 16, replaces middleware) ─────────────────────────────────
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");

  cleanupStore();

  // ── Preflight CORS ────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }

  // ── Webhook routes: signature-verified, skip CORS, relaxed rate limit ─────
  if (matchesPath(pathname, WEBHOOK_PATHS)) {
    const key = getRateLimitKey(req, "webhooks");
    if (!checkRateLimit(key, LIMITS.webhooks)) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "60" },
      });
    }
    // Let through — signature verification happens inside the route
    return NextResponse.next();
  }

  // ── Admin routes: token required ──────────────────────────────────────────
  if (matchesPath(pathname, ADMIN_PATHS)) {
    // Admin UI pages skip API auth check (handled by client-side session)
    if (!pathname.startsWith("/api/admin")) {
      return NextResponse.next();
    }

    const key = getRateLimitKey(req, "auth");
    if (!checkRateLimit(key, LIMITS.auth)) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": "900" },
      });
    }

    if (!isAdminAuthorized(req)) {
      return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return NextResponse.next();
  }

  // ── Agent routes: strict rate limit ──────────────────────────────────────
  if (matchesPath(pathname, AGENT_PATHS)) {
    const key = getRateLimitKey(req, "agents");
    if (!checkRateLimit(key, LIMITS.agents)) {
      return new NextResponse(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
          ...getCorsHeaders(origin),
        },
      });
    }

    // Support agent has a different rate limit
    if (pathname.startsWith("/api/agents/support")) {
      const supportKey = getRateLimitKey(req, "support");
      if (!checkRateLimit(supportKey, LIMITS.support)) {
        return new NextResponse(
          JSON.stringify({ error: "Message rate limit exceeded" }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "300",
              ...getCorsHeaders(origin),
            },
          }
        );
      }
    }

    const response = NextResponse.next();
    Object.entries(getCorsHeaders(origin)).forEach(([k, v]) =>
      response.headers.set(k, v)
    );
    return response;
  }

  // ── Lead/intake submission: anti-spam ────────────────────────────────────
  if (matchesPath(pathname, LEAD_PATHS) && req.method === "POST") {
    const key = getRateLimitKey(req, "leads");
    if (!checkRateLimit(key, LIMITS.leads)) {
      return new NextResponse(
        JSON.stringify({ error: "Too many submissions. Please wait." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "900",
            ...getCorsHeaders(origin),
          },
        }
      );
    }
  }

  // ── General API rate limit ────────────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const key = getRateLimitKey(req, "api");
    if (!checkRateLimit(key, LIMITS.api)) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
          ...getCorsHeaders(origin),
        },
      });
    }

    const response = NextResponse.next();
    Object.entries(getCorsHeaders(origin)).forEach(([k, v]) =>
      response.headers.set(k, v)
    );
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
    // Match admin pages
    "/admin/:path*",
    // Exclude Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
