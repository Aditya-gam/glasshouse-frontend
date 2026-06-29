import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

// Visualize the client/server bundles with `pnpm analyze` (ANALYZE=true). No-op otherwise.
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === "true" });

/**
 * Static security headers (applied to every response). The Content-Security-Policy is set
 * separately, per-request with a nonce, by Clerk in `proxy.ts` — only the CSP needs the nonce.
 * COOP uses `same-origin-allow-popups` so Clerk's OAuth popups keep their opener.
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" }, // clickjacking; CSP frame-ancestors is the modern twin
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withBundleAnalyzer(nextConfig);
