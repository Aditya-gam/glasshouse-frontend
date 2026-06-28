import { http, HttpResponse } from "msw";

/**
 * Contract-shaped MSW handlers (M5.6), matching the backend's published OpenAPI. The host
 * is wildcarded so they work regardless of `NEXT_PUBLIC_API_BASE_URL`. These are happy-path
 * defaults — tests add per-case overrides (errors, edge shapes) with `server.use(...)`.
 *
 * Only the live `runs` path is modelled here; `inferences` / `eval` / `remediations` still
 * 501 on the backend, so their screens use fixtures until they ship (then add handlers here).
 */
// Run ids are UUIDs in the contract (the generated Zod boundary enforces it).
const RUN_ID = "11111111-1111-4111-8111-111111111111";

export const handlers = [
  // POST /v1/runs → 202 Accepted + run id.
  http.post("*/v1/runs", () =>
    HttpResponse.json({ run_id: RUN_ID, status: "queued" }, { status: 202 }),
  ),

  // GET /v1/runs/{id} → run status (poll fallback).
  http.get("*/v1/runs/:runId", ({ params }) =>
    HttpResponse.json(
      { id: String(params.runId), type: "attack", status: "succeeded" },
      { status: 200 },
    ),
  ),
];
