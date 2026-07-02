import "server-only";

import { listInferencesV1InferencesGet } from "@/lib/api";
import type { AttributeRead } from "@/lib/api";
import { zListInferencesV1InferencesGetResponse } from "@/lib/api/zod.gen";
import { attrItemsSchema, type AttrItem } from "@/lib/schemas/attribute";

import { backendAuth, toBackendError } from "./backend";

/**
 * Inferences DAL — `GET /v1/inferences` (live at BE M1.7+). Returns the audited subject's
 * calibrated attribute reads, mapped to the UI's `AttrItem` shape at the trust boundary.
 */

/**
 * API `AttributeRead` → UI `AttrItem`. Reliability is 0..1 on the wire; the UI renders %.
 * Explicit field-by-field: the wire uses `null` for absent optionals (FastAPI), the UI
 * schema uses absent keys — a spread would leak nulls past `.optional()`.
 */
function toAttrItem(read: AttributeRead): unknown {
  const { reliability } = read;
  return {
    code: read.code,
    label: read.label,
    value: read.value,
    detail: read.detail,
    evidence: read.evidence,
    sev: read.severity,
    ...(read.evidence_count != null ? { evidenceCount: read.evidence_count } : {}),
    ...(read.abstain != null ? { abstain: read.abstain } : {}),
    ...(read.sensitive != null ? { sensitive: read.sensitive } : {}),
    ...(read.art9 != null ? { art9: read.art9 } : {}),
    // `null` reliability ⇔ abstain (backend contract) — omit the % fields entirely.
    ...(reliability
      ? {
          reliability: Math.round(reliability.point * 100),
          lo: Math.round(reliability.lo * 100),
          hi: Math.round(reliability.hi * 100),
        }
      : {}),
  };
}

/**
 * List the caller's inferred attributes (optionally scoped to one run). Zod-validates the
 * wire shape, then re-validates the mapped result against the UI schema — a contract drift
 * (unknown code, out-of-range reliability) throws rather than rendering garbage.
 */
export async function listInferences(runId?: string): Promise<AttrItem[]> {
  const { token, devUserId } = await backendAuth();
  const { data, error, response } = await listInferencesV1InferencesGet({
    query: runId ? { run_id: runId } : undefined,
    auth: token,
    headers: devUserId ? { "x-dev-user-id": devUserId } : undefined,
  });
  if (error || !data) throw toBackendError(error, response);
  const reads = zListInferencesV1InferencesGetResponse.parse(data); // wire boundary
  return attrItemsSchema.parse(reads.map(toAttrItem)); // UI boundary
}
