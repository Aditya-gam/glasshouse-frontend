## What & why

<!-- What does this change do, and why? Link the task id from docs/11-roadmap/tasks-frontend.md. -->

Task:

## Screenshots / recording

<!-- Required for any UI change (before/after if relevant). Delete this section for non-UI changes. -->

## Checklist

- [ ] `pnpm typecheck` + `pnpm lint` + `pnpm format:check` pass; no `any`
- [ ] Tests added/updated where meaningful (Vitest + RTL + MSW; Playwright for async Server Components)
- [ ] Accessibility: semantic HTML, full keyboard path, WCAG AA (axe clean for a11y-affecting changes)
- [ ] Honest-UI invariants where applicable (calibrated reliability only; no-false-safety note; advise-only CTAs)
- [ ] No secrets client-side (only `NEXT_PUBLIC_*`); sensitive data stays in the DAL
- [ ] Docs updated if behavior diverged from the spec
- [ ] Conventional Commit title referencing the task id
