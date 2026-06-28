# Glasshouse — Frontend

![CI](https://img.shields.io/github/actions/workflow/status/Aditya-gam/glasshouse-frontend/ci.yml?label=CI) ![Next.js](https://img.shields.io/badge/Next.js-16-000000) ![license](https://img.shields.io/badge/license-MIT-blue)

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

Copy [`.env.example`](.env.example) to `.env.local` if you need to point at a backend. The UI runs on
**MSW mocks** with no backend until M5.4, so this is optional for most work.

## Scripts

| Script                         | Purpose                                     |
| ------------------------------ | ------------------------------------------- |
| `pnpm dev`                     | Dev server (Turbopack).                     |
| `pnpm build`                   | Production build.                           |
| `pnpm typecheck`               | `tsc --noEmit` (strict).                    |
| `pnpm lint`                    | ESLint (flat config, `eslint-config-next`). |
| `pnpm format` / `format:check` | Prettier write / check.                     |

A husky `pre-commit` hook runs `lint-staged` (ESLint `--fix` + Prettier on staged files); `tsc`, the
full lint, the build, and Semgrep run in CI.

## Project structure

```
app/            App Router — routes + route-local _components/ (added per screen in M5.5)
components/     Shared components — ui/ (shadcn primitives) + bespoke
lib/            dal/ (server-only data access) · api/ (generated client + Zod) · hooks/ (TanStack Query)
__tests__/      Vitest + RTL + MSW (M5.6)
e2e/            Playwright critical paths (M5.6)
instrumentation.ts   OpenTelemetry registration
```

> **Status:** **R2 — bootstrap** (this commit). Build order, screens, and the cross-repo seam (M5.4)
> are tracked in the hub's `docs/11-roadmap/tasks-frontend.md`. Screens are synced from
> `glasshouse/prototype/` per `docs/07-frontend/prototype-mapping.md`.
