import "server-only";

import { listInferences } from "@/lib/dal/inferences";
import { ATTRIBUTES } from "@/lib/fixtures/attributes";
import { attrItemsSchema, type AttrItem } from "@/lib/schemas/attribute";

/**
 * The audited subject's inferred attributes — LIVE from `GET /v1/inferences` (BE M1.7+),
 * behind the accessor so callers (Server Components) stay unchanged.
 *
 * Fallback posture (demo until the backend is publicly deployed): if live data is
 * unavailable — backend down/unreachable, endpoint still 501, or no credential — serve the
 * typed fixtures and log the reason server-side. An EMPTY live result is real data (the
 * user has no runs yet) and passes through to the dashboard's empty state, never fixtures.
 */
export async function getAttributes(): Promise<AttrItem[]> {
  try {
    return await listInferences();
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn("[data/attributes] live inferences unavailable - serving fixtures:", reason);
    return attrItemsSchema.parse(ATTRIBUTES);
  }
}
