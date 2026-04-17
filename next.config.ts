import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Content Security Policy — restrictive by default, adjusted for Stripe/Supabase
const cspDirectives = [
  "default-src 'self'",
  // Scripts: self + Stripe.js
  `script-src 'self' https://js.stripe.com ${isDev ? "'unsafe-eval' 'unsafe-inline'" : ""}`,
  // Styles: self + inline (Tailwind generates inline styles)
  "style-src 'self' 'unsafe-inline'",
  // Images: self + data URIs + Supabase storage + Stripe
  "img-src 'self' data: blob: https://*.supabase.co https://*.stripe.com",
  // Fonts: self only
  "font-src 'self'",
  // Connect: self + Supabase + Stripe + Resend + Twilio
  "connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.resend.com https://api.twilio.com",
  // Frames: Stripe payment elements only
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  // Media: self only
  "media-src 'self'",
  // Objects: none
  "object-src 'none'",
  // Base URI: self
  "base-uri 'self'",
  // Form action: self
  "form-action 'self'",
  // Upgrade insecure requests in production
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  // HIPAA / HITRUST required headers
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self https://js.stripe.com)",
  },
  {
    key: "Content-Security-Policy",
    value: cspDirectives,
  },
  // Cache control for pages containing PHI — never cache at CDN
  {
    key: "Cache-Control",
    value: "no-store, no-cache, must-revalidate, proxy-revalidate",
  },
  // HIPAA audit trail header (requests identify the app)
  {
    key: "X-App-Name",
    value: "slimrx",
  },
];

const nextConfig: NextConfig = {
  // Remove X-Powered-By (don't leak server info)
  poweredByHeader: false,

  // Gzip compression
  compress: true,

  // React strict mode catches subtle bugs
  reactStrictMode: true,

  // Apply security headers to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // API routes: additional no-cache to prevent PHI leaking via CDN
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
        ],
      },
    ];
  },

  // Logging for audit trail awareness
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
};

export default nextConfig;
