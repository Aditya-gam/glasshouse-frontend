# Rules — Frontend (Next.js · React · TypeScript)

Client construction. Govern docs + implementation. (≤200 lines.)

## Data access & exposure (Next.js official)
- **Data Access Layer (DAL)** — a `server-only` module that controls *what* is fetched, performs **authorization checks**, and returns **minimal DTOs**. Only the DAL reads `process.env`. *Why:* one enforced place; stops secrets/private fields leaking into the render tree. Pick *one* fetch approach (HTTP / DAL / component-level) and don't mix.
- **Server vs Client isolation** — Server Components access secrets/DB/internal APIs; **Client Components must follow browser security assumptions** (no privileged data). Mark server modules `import 'server-only'`. *Why:* secure by default; build error if server code is imported client-side.
- **Control return values + sanitize** — pass only the fields the client needs, never raw DB records. Add the **taint APIs** (`experimental_taintObjectReference` / `taintUniqueValue`) as a backstop. *Why:* defense against accidental exposure (critical for a privacy product).

## Server Actions security
- **Re-verify auth/authz *inside every action*** — a page-level check does **not** extend to its actions (a separate POST entry point). Check **authorization, not just authentication** (verify the caller owns the resource → no **IDOR**). *Why:* actions are directly reachable.
- **Validate all client input** (form data, params, headers, `searchParams`) — they're trivially forged. **No mutations during render** (use actions). *Why:* client data is untrusted; render side-effects cause bugs/CSRF.

## React correctness
- **Rules of Hooks** — call hooks only at the top level, only from React functions. **Components & hooks must be pure.** *Why:* the model breaks otherwise.
- **"You might not need an Effect"** — if you can compute it during render, do (or `useMemo`); reset state via a **`key`** prop, not an effect. *Why:* fewer effects = simpler, faster, fewer bugs.

## Security headers & auth boundary
- **Auth is NOT in middleware/proxy** — put it in Route Handlers / Server Actions / the DAL. *Why:* a 2025 CVSS-9.1 CVE let attackers skip Next.js middleware via `x-middleware-subrequest`; the request interceptor (renamed **`proxy.ts`** in Next 16) is for redirects, not the security boundary.
- **Nonce-based CSP, no `unsafe-inline`** — Content-Security-Policy whitelists what can load/run. *Why:* the primary XSS defense.

## Accessibility (WCAG) & types
- **Semantic HTML first; ARIA only when needed; `alt` on images; full keyboard operability; WCAG AA contrast.** *Why:* legal+ethical baseline; matters for the at-risk persona.
- **TypeScript `strict`, no `any`; API types from the **generated OpenAPI client** (`@hey-api/openapi-ts`) + **`Zod`** to parse/validate at the trust boundary; TanStack Query for client data/polling.** *Why:* the client can't drift from the contract, runtime validation still guards the boundary; our async runs need polling/caching.

## Sources
- [Next.js — Data Security](https://nextjs.org/docs/app/guides/data-security) · [Next.js — CSP](https://nextjs.org/docs/app/guides/content-security-policy) · [React — Rules / You-Might-Not-Need-an-Effect](https://react.dev/learn/you-might-not-need-an-effect) · [WCAG 2.2 (W3C)](https://www.w3.org/WAI/standards-guidelines/wcag/) · [OWASP IDOR](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html).
