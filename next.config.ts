import type { NextConfig } from "next";

// Supabase origin is needed in connect-src / img-src for auth, storage, and REST.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseOrigin = (() => {
  try {
    return supabaseUrl ? new URL(supabaseUrl).origin : "";
  } catch {
    return "";
  }
})();

// Baseline Content-Security-Policy.
// NOTE: 'unsafe-inline'/'unsafe-eval' for scripts are a pragmatic baseline so the
// current app keeps working; harden to a nonce-based policy as a follow-up.
const csp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob: ${supabaseOrigin}`.trim(),
  `font-src 'self' data:`,
  `connect-src 'self' ${supabaseOrigin} https://*.supabase.co wss://*.supabase.co`.trim(),
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `object-src 'none'`,
]
  .join("; ")
  .replace(/\s+/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Pin the workspace root. Otherwise Next/Turbopack mis-detects it as the
  // user's home dir (a stray package-lock.json lives there + multiple
  // lockfiles), which breaks file-watching/HMR so dev edits never recompile.
  turbopack: {
    root: process.cwd(),
  },
  // Build-time safety: do NOT ship type errors to production.
  // (Next 16 removed the `eslint` build hook; linting runs via `npm run lint`
  // in CI — see .github/workflows/ci.yml.)
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
