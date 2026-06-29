# 2. Clerk-managed strict nonce CSP, rolled out report-only first

- Status: accepted
- Date: 2026-06

## Context and Problem Statement

[`.claude/rules/frontend.md`](../../.claude/rules/frontend.md) mandates a **nonce-based
Content-Security-Policy with no `unsafe-inline`** — the primary XSS defense for a privacy
product. The app uses Clerk, which injects its own scripts at runtime, and Next 16 with
`<ClerkProvider>`. How do we ship a strict CSP that tolerates Clerk's scripts without
weakening the policy or breaking the app?

## Decision Drivers

- Strict policy: nonce + `strict-dynamic`, no `unsafe-inline` taking effect in modern browsers.
- Must coexist with Clerk's injected scripts and Next's framework/hydration scripts.
- Must not reintroduce a bypassable security decision in middleware (see
  [ADR 0001](0001-auth-in-dal-not-middleware.md)).
- Zero-risk rollout — no chance of a blank-page production break.

## Considered Options

1. **Clerk-managed strict CSP** — `clerkMiddleware({ contentSecurityPolicy: { strict: true } })`;
   Clerk generates the nonce, sets `x-nonce`, and maintains its own required directives.
2. **Hand-rolled nonce CSP** in `proxy.ts` per the Next.js guide — full control, but we must
   hardcode and maintain Clerk's domain list.
3. **Static / hash-based (SRI) CSP** — keeps static rendering, but is experimental and fights
   Clerk's runtime-injected scripts; cannot satisfy "no `unsafe-inline`" with Clerk.

## Decision Outcome

Chosen: **option 1**, rolled out **report-only first, then enforcing**.

`proxy.ts` (still callback-free, so not an auth boundary) sets the CSP; `<ClerkProvider dynamic>`
forwards the per-request nonce to the scripts, which forces dynamic rendering app-wide.
Phase 1 shipped `Content-Security-Policy-Report-Only`; phase 2 flipped to enforcing after a
real-browser guard (`e2e/csp.spec.ts`) confirmed zero violations.

### Consequences

- Good: satisfies the rule — `script-src` is nonce + `strict-dynamic` (the legacy
  `'unsafe-inline'` Clerk also emits is ignored by strict-dynamic-aware browsers). Clerk tracks
  its own domain changes, so the policy doesn't rot.
- Good: putting CSP in `proxy.ts` is **header injection, not an authz decision** — if bypassed,
  the response merely lacks the CSP header; no data leaks (the DAL/backend still fail closed).
- Bad: nonce CSP requires **dynamic rendering** — no static optimization, ISR, PPR, or CDN
  edge-caching. Accepted because the app is auth-gated and mostly dynamic already.
- Sharp edge found: Next auto-nonces its own scripts, but **next-themes' anti-flash inline
  script** is injected by us and needed the nonce passed explicitly
  (`<ThemeProvider nonce={…}>`) — the one real violation, now guarded against.

## More Information

Verified live: production returns an enforcing `Content-Security-Policy` (nonce + strict-dynamic).
Static headers (HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`,
`Cross-Origin-Opener-Policy: same-origin-allow-popups`) are set in `next.config.ts` `headers()`.
[Next.js CSP guide](https://nextjs.org/docs/app/guides/content-security-policy) ·
[Clerk CSP guide](https://clerk.com/docs/guides/secure/best-practices/csp-headers).
