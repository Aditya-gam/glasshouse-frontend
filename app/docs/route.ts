import { ApiReference } from "@scalar/nextjs-api-reference";

import spec from "@/openapi/openapi.json";

/**
 * Interactive API reference (Scalar), rendered from the vendored OpenAPI spec — no backend
 * needed. The spec is imported (bundled at build), so it can never drift from `openapi/`.
 *
 * Strict-CSP note: the handler is built per request so Clerk's per-request nonce (`x-nonce`,
 * set in proxy.ts) reaches Scalar, which stamps it on its inline config script, the CDN
 * bootstrap tag, and its style tags — `script-src` stays nonce + strict-dynamic with no
 * relaxation. Scalar's one extra need, `style-src 'unsafe-inline'` (inline style attributes),
 * is already part of Clerk's strict policy. Guarded by e2e/csp.spec.ts.
 */
export function GET(request: Request): Response {
  const nonce = request.headers.get("x-nonce") ?? undefined;
  return ApiReference({
    content: spec,
    nonce,
    pageTitle: "Glasshouse API — Reference",
    // Privacy posture: no third-party egress beyond the CDN bundle itself. System fonts
    // (not fonts.scalar.com), no Scalar telemetry, no registry search (api.scalar.com).
    withDefaultFonts: false,
    telemetry: false,
    hideSearch: true,
    hideClientButton: true,
    // The CDN bundle unconditionally prefetches Scalar's public API registry. Point every
    // external URL at our own origin: the requests stay same-origin (a harmless 404) instead
    // of egressing to *.scalar.com — keeping /docs zero-third-party under connect-src 'self'.
    externalUrls: {
      apiBaseUrl: "/api/scalar-external-disabled",
      registryUrl: "/api/scalar-external-disabled",
      dashboardUrl: "/api/scalar-external-disabled",
      proxyUrl: "/api/scalar-external-disabled",
    },
  })();
}
