# Glasshouse — Frontend

[![live demo](https://img.shields.io/badge/live-glasshouse--frontend.vercel.app-000000?logo=vercel&logoColor=white)](https://glasshouse-frontend.vercel.app/) ![CI](https://img.shields.io/github/actions/workflow/status/Aditya-gam/glasshouse-frontend/ci.yml?label=CI) ![Next.js](https://img.shields.io/badge/Next.js-16-000000) ![license](https://img.shields.io/badge/license-MIT-blue)

Next.js frontend for **Glasshouse** (privacy self-audit: **Attack → Measure → Defend**). Part of the
[glasshouse](https://github.com/Aditya-gam/glasshouse) project — the spec (`docs/`) and the UI prototype
live in the hub repo.

**Stack:** Next.js 16 (App Router) · TypeScript strict · pnpm · Tailwind v4 · shadcn/ui · Lucide ·
TanStack Query · generated OpenAPI client (`@hey-api/openapi-ts`) + Zod at the boundary · OpenTelemetry.

## Prerequisites

- **Node 20** — `nvm use` reads [`.nvmrc`](.nvmrc).
- **pnpm** — `corepack enable` (the version is pinned via `packageManager` in `package.json`).

## Getting started

```bash
nvm use            # Node 20
corepack enable    # pnpm
pnpm install
pnpm dev           # http://localhost:3000
```

Copy [`.env.example`](.env.example) to `.env.local` for Clerk auth + the backend URL. Screens render
on fixtures without a backend, so a running API is only needed to exercise the live-data paths.

## Scripts

| Script                         | Purpose                                             |
| ------------------------------ | --------------------------------------------------- |
| `pnpm dev`                     | Dev server (Turbopack).                             |
| `pnpm build`                   | Production build.                                   |
| `pnpm typecheck`               | `tsc --noEmit` (strict).                            |
| `pnpm lint`                    | ESLint (flat config, `eslint-config-next`).         |
| `pnpm test` / `test:run`       | Vitest + RTL + MSW (watch / once).                  |
| `pnpm format` / `format:check` | Prettier write / check.                             |
| `pnpm spec:pull`               | Refresh the vendored OpenAPI spec from the backend. |
| `pnpm api:generate`            | Regenerate the typed client (`@hey-api`).           |

A husky `pre-commit` hook runs `lint-staged` (ESLint `--fix` + Prettier on staged files); `tsc`, the
full lint, Prettier, the client drift-guard, the Vitest suite, the build, and Semgrep run in CI.

## Deploy (Vercel)

Deployed on **Vercel** via native Git integration — every PR gets a preview URL and `main` deploys to
production. The repo is **zero-config**: Vercel auto-detects Next.js, reads Node 20 from
[`.nvmrc`](.nvmrc) and pnpm from `packageManager`, so no `vercel.json` is needed.

**One-time setup (Vercel dashboard):**

1. **Add New → Project → Import** `Aditya-gam/glasshouse-frontend`. The **Next.js** preset is detected;
   leave the build/install commands as detected (`next build` / `pnpm install`).
2. Add the environment variables below for **Production** and **Preview**.
3. Deploy. PRs then build preview URLs automatically.

**Environment variables** (contract in [`.env.example`](.env.example)):

| Variable                                                          | Secret? | Notes                                                                                      |
| ----------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`                               | no      | Clerk instance — must **match** the instance the backend verifies JWTs against.            |
| `CLERK_SECRET_KEY`                                                | **yes** | Clerk secret; server-only.                                                                 |
| `NEXT_PUBLIC_API_BASE_URL`                                        | no      | Deployed backend URL. Until the backend is deployed, live-data paths fall to 501/fixtures. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` / `…_SIGN_UP_URL`                 | no      | `/sign-in` · `/sign-up`.                                                                   |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` / `…_SIGN_UP_…` | no      | `/`.                                                                                       |
| `DEV_USER_ID`                                                     | **yes** | Dev-only `X-Dev-User-Id` fallback; leave **unset** in production (fail-closed).            |

> **Clerk instance:** use the shared **dev** instance for previews now (it must match the backend);
> migrating to a Clerk **production** instance is a later coordinated change with the backend. Auth is
> enforced in the DAL + backend, not middleware — see [`.claude/rules/frontend.md`](.claude/rules/frontend.md).

## Project structure

```
app/            App Router — routes + route-local _components/; app/api/ (server-side SSE proxy)
components/     Shared — ui/ (shadcn primitives) + app-shell, attribute, providers
lib/            dal/ (server-only data access) · api/ (generated client + Zod) · mocks/ (MSW) · fixtures/
proxy.ts        Clerk session-context middleware (NOT the auth boundary — enforcement is in the DAL)
*.test.ts(x)    Vitest + RTL + MSW, colocated next to source (Playwright E2E pending a deployed backend)
instrumentation.ts   OpenTelemetry registration
```

> **Status:** Frontend complete through **M5.6** — all 7 screens, Clerk auth + server-only DAL +
> generated client + live-data wiring (the `runs` path) + the Vitest/RTL/MSW suite, on `main`.
> Per-endpoint live screen-swaps land as the backend ships `/v1/inferences`, `/v1/eval/*`,
> `/v1/remediations`. Build order is tracked in the hub's `docs/11-roadmap/tasks-frontend.md`.
