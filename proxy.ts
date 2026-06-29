import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk session-context middleware — NOT the authorization boundary.
 *
 * ADR: `.claude/rules/frontend.md` mandates "auth is NOT in middleware/proxy" (the 2025
 * `x-middleware-subrequest` CVSS-9.1 bypass CVE; on Next 16 the interceptor is `proxy.ts`).
 * We pass NO auth callback, so this gates nothing — it ONLY (a) attaches the Clerk session
 * to the request context (required for server-side `auth()`/`getToken()`) and (b) injects a
 * strict, nonce-based Content-Security-Policy.
 *
 * Why CSP belongs here without violating that rule: a CSP is *header injection*, not an
 * authorization decision. If this middleware were bypassed, the response merely lacks the CSP
 * header (a degraded defense-in-depth layer) — no privileged data leaks, because the DAL and
 * backend still fail closed (no token ⇒ no data). `proxy.ts` is also Next.js's recommended
 * place to set a per-request nonce.
 *
 * CSP rollout (frontend.md "nonce-based CSP, no unsafe-inline"): `reportOnly: true` is phase 1
 * — it emits `Content-Security-Policy-Report-Only`, surfacing violations in the browser console
 * without blocking. Flip to enforcing (drop `reportOnly`) once the preview is clean. `strict`
 * ⇒ nonce + `strict-dynamic`; it requires `<ClerkProvider dynamic>` (app/layout.tsx), which
 * forces dynamic rendering app-wide. Clerk generates the nonce and forwards it via `x-nonce`.
 *
 * All enforcement lives downstream and fails closed:
 *   - the DAL (`lib/dal/*`) attaches the caller's token; no token ⇒ no privileged data,
 *   - the backend re-verifies the JWT + `require_permission` + resource ownership.
 */
export default clerkMiddleware({
  contentSecurityPolicy: {
    strict: true,
    reportOnly: true,
  },
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless referenced in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
