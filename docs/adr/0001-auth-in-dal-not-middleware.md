# 1. Enforce authorization in the Data Access Layer, not in middleware

- Status: accepted
- Date: 2026-06

## Context and Problem Statement

Glasshouse is a privacy product: a missing authorization check leaks another user's
adversarial inference data. Next.js offers several places to enforce auth — the request
interceptor (`middleware`, renamed `proxy.ts` in Next 16), Server Components/layouts, Route
Handlers, Server Actions, and a Data Access Layer. Where should the enforced boundary live?

## Decision Drivers

- **Fail-closed** — an unverified request must be denied, never served.
- A 2025 **CVSS-9.1 CVE** (`x-middleware-subrequest`) let attackers **skip Next.js middleware**
  entirely by forging a header. A boundary that can be bypassed is not a boundary.
- Each entry point (page, action, route handler) is independently reachable — a page-level
  check does **not** extend to its actions.
- The product needs one enforced, auditable place; defense-in-depth on top is welcome.

## Considered Options

1. **Auth in `proxy.ts` / middleware** — one gate in front of everything.
2. **Auth in each Server Component / layout** — check per page.
3. **Auth in a server-only Data Access Layer (DAL)**, re-verified by the backend.

## Decision Outcome

Chosen: **option 3 — the DAL is the enforced boundary**, and the backend independently
re-verifies every request (JWT + permission + resource ownership). `proxy.ts` calls
`clerkMiddleware()` with **no callback**: it only attaches the Clerk session to the request
context (so `auth()`/`getToken()` work server-side) and gates nothing.

### Consequences

- Good: the boundary cannot be bypassed by the middleware CVE — if `proxy.ts` is skipped,
  `auth()` returns null and the DAL denies. Two independent checks (DAL + backend) must both
  pass. Authorization (not just authentication) is verified — the caller must **own** the
  resource, closing IDOR.
- Good: one server-only module (`lib/dal/*`) controls what is fetched and returns minimal
  DTOs — secrets and private fields never reach the render tree.
- Bad: UX route-gating (redirect anonymous users) must be done explicitly in a server layout
  via `auth()`, not for free in middleware.

## More Information

`proxy.ts` later also injects the strict CSP nonce — see [ADR 0002](0002-clerk-managed-strict-csp.md)
for why that does **not** reintroduce a bypassable security decision. Rule:
[`.claude/rules/frontend.md`](../../.claude/rules/frontend.md) · [OWASP IDOR cheat sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html).
