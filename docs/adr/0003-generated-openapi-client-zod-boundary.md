# 3. Generated OpenAPI client + Zod validation at the trust boundary

- Status: accepted
- Date: 2026-05

## Context and Problem Statement

The frontend consumes a FastAPI backend defined by an OpenAPI schema (published from a separate
repo). Hand-written DTOs drift from the contract, and external data is untrusted at runtime. How
do we keep the client in lock-step with the backend **and** validate data at the boundary?

## Decision Drivers

- TypeScript `strict`, no `any`; type at the boundaries.
- The client must not silently drift from the published contract.
- Runtime data is untrusted — types alone don't validate it (a 200 can still carry the wrong shape).

## Considered Options

1. **Hand-written DTOs + `fetch`** — full control, but drifts and duplicates the contract.
2. **Generated client only** (`@hey-api/openapi-ts`) — types track the contract, but TS types
   are erased at runtime (no validation).
3. **Generated client + generated Zod schemas**, parsed at the boundary, with a CI drift-guard.

## Decision Outcome

Chosen: **option 3**. `@hey-api/openapi-ts` generates the typed client **and** Zod schemas
(`lib/api/`); the DAL parses responses with Zod before returning DTOs. CI runs `pnpm api:check`
(regenerate from the vendored spec, fail on any diff) so a stale client or un-regenerated spec
bump breaks the build.

### Consequences

- Good: the client cannot drift from the contract undetected; the Zod parse turns a
  contract-violating response into a caught error at the boundary, not a deep render crash.
- Good: replaces hand-mirrored DTO checks; one source of truth (the OpenAPI schema).
- Bad: a backend spec change requires re-pulling the spec and regenerating (the drift-guard
  enforces this); generated code is vendored and excluded from coverage/lint as appropriate.

## More Information

Spec workflow: `pnpm spec:pull` (refresh vendored `openapi/openapi.json`) → `pnpm api:generate`.
Rule: [`.claude/rules/frontend.md`](../../.claude/rules/frontend.md) ·
[`@hey-api/openapi-ts`](https://heyapi.dev/) · [Zod](https://zod.dev/).
