import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk session-context middleware — NOT the authorization boundary.
 *
 * ADR: `.claude/rules/frontend.md` mandates "auth is NOT in middleware/proxy" (the 2025
 * `x-middleware-subrequest` CVSS-9.1 bypass CVE; on Next 16 the interceptor is `proxy.ts`).
 * We call `clerkMiddleware()` with NO callback, so it ONLY attaches the Clerk session to
 * the request context — required for server-side `auth()`/`getToken()` — and gates nothing.
 *
 * All enforcement lives downstream and fails closed:
 *   - the DAL (`lib/dal/*`) attaches the caller's token; no token ⇒ no privileged data,
 *   - the backend re-verifies the JWT + `require_permission` + resource ownership.
 * If this middleware were ever bypassed, `auth()` returns null ⇒ the DAL denies. Any UX
 * route-gating (redirect anon users) belongs in a server layout via `auth()`, not here.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless referenced in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
