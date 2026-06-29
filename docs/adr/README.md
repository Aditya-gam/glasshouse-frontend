# Architecture Decision Records

Significant frontend decisions, in [MADR](https://adr.github.io/madr/) format — each records the
context, the options weighed, the choice, and its consequences, so future-you knows the _why_.

| #                                                     | Decision                                                     | Status   |
| ----------------------------------------------------- | ------------------------------------------------------------ | -------- |
| [0001](0001-auth-in-dal-not-middleware.md)            | Enforce authorization in the DAL, not in middleware          | accepted |
| [0002](0002-clerk-managed-strict-csp.md)              | Clerk-managed strict nonce CSP, rolled out report-only first | accepted |
| [0003](0003-generated-openapi-client-zod-boundary.md) | Generated OpenAPI client + Zod validation at the boundary    | accepted |

New ADR: copy the structure of an existing one, take the next number, and link it here.
Broader engineering standards live in [`.claude/rules/`](../../.claude/rules/).
