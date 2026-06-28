import { http, HttpResponse } from "msw";

import { ATTRIBUTES } from "@/lib/fixtures/attributes";

/**
 * Mock API handlers serving the typed fixtures. The host is wildcarded so the same
 * handlers work regardless of `NEXT_PUBLIC_API_URL`. Paths are reconciled against the
 * backend's published `openapi.json` in M5.4; until then these back the M5.6 tests and
 * any client-side fetches.
 */
export const handlers = [http.get("*/v1/attributes", () => HttpResponse.json(ATTRIBUTES))];
