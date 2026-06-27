# CLAUDE.md — Glasshouse Frontend

Next.js frontend for **Glasshouse**. The authoritative spec is the **hub repo**
(`../Privacy-Exposure-App/docs/`, GitHub: `glasshouse`).

## Read first
- `docs/11-roadmap/tasks-frontend.md` — build order (R.2 → M5 screens → tests).
- `docs/07-frontend/*` — design-system, components, **prototype-mapping** (the `window.*`→TSX build map), state-and-polling, persona-lens.
- `prototype/` (in the hub) — the built reference to **sync FROM**.

## Engineering rules
Follow `.claude/rules/*` — architecture · frontend · code-style · testing · security-privacy · infra-devops. **SDE-2/3 bar; `tsc` + ESLint clean; one conventional commit per task.**

## Stack & layout
Next.js App Router · TS strict · **pnpm** · Tailwind v4 · shadcn/ui · Lucide · TanStack Query · generated OpenAPI client + **Zod** at the boundary. **Hybrid components** (shared in `components/`, route-specific colocated in `_components/`). Auth in the **DAL / route handlers**, never middleware/`proxy.ts`.

## Critical (non-negotiable)
- **Calibrated reliability only** (never raw confidence); the **no-false-safety** note on Defend; severity = icon + label + desaturated heatmap; **advise-only** CTAs; WCAG AA.
- Never expose secrets client-side — only `NEXT_PUBLIC_*`; everything sensitive stays server-side (DAL).
