# Security Policy

## Supported versions

Only the code on `main` is actively maintained. Older tags are not patched.

## Reporting a vulnerability

**Do not open a public GitHub issue for security problems.**

If you discover a vulnerability, please report it privately:

1. Go to the repository's **Security** tab on GitHub
2. Click **Report a vulnerability** (GitHub Private Vulnerability Reporting)

Or email **security@slimrx.com** with:

- A description of the issue
- Steps to reproduce
- Affected routes, endpoints, or components
- Your assessment of the impact

We aim to acknowledge reports within **2 business days** and resolve
confirmed high-severity issues within **7 days**.

## Scope

This project is a telehealth platform handling protected health information
(PHI). Security-relevant areas include:

- Supabase Row Level Security (`supabase/schema.sql`)
- Stripe webhook signature validation (`app/api/webhooks/stripe/route.ts`)
- Twilio webhook signature validation (`app/api/webhooks/twilio/route.ts`)
- Admin authentication (`lib/auth.ts`, `proxy.ts`)
- Patient authentication (`lib/auth.ts`, `lib/supabase.ts`)
- Audit logging (append-only tables in `supabase/schema.sql`)
- Content Security Policy and security headers (`next.config.ts`, `proxy.ts`)

## Out of scope

- Denial of service via unauthenticated endpoints — these are rate-limited
  upstream (Vercel / Cloudflare)
- Social engineering of operators
- Third-party services (Stripe, Twilio, Resend, Supabase, Anthropic)

## Safe harbor

Good-faith security research is welcomed. If you follow this policy, we
will not pursue legal action for your testing.
