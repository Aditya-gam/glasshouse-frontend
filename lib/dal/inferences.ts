import "server-only";

import { getInferenceV1InferencesInferenceIdGet, listInferencesV1InferencesGet } from "@/lib/api";
import type { AttributeFindingRead, AttributeRead, EvidenceRead } from "@/lib/api";
import {
  zGetInferenceV1InferencesInferenceIdGetResponse,
  zListInferencesV1InferencesGetResponse,
} from "@/lib/api/zod.gen";
import type { EvidenceItem, LocationFinding } from "@/lib/fixtures/attribution";
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
    ...(read.id != null ? { id: read.id } : {}),
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

/** The attribution detail, mapped to the UI shapes. */
export interface AttributionDetail {
  finding: LocationFinding;
  evidence: EvidenceItem[];
  /**
   * True when this is a special-category (Art. 9) finding whose value/reasoning/evidence
   * rationale the backend masked for lack of `art9_inference` consent (fail closed).
   */
  masked: boolean;
}

/** Wire evidence → UI evidence (identical field names; nulls become absent keys). */
function toEvidenceItem(item: EvidenceRead): EvidenceItem {
  return {
    id: item.id,
    kind: item.kind,
    type: item.type,
    source: item.source,
    date: item.date,
    ...(item.text != null ? { text: item.text } : {}),
    ...(item.spans != null ? { spans: item.spans } : {}),
    ...(item.caption != null ? { caption: item.caption } : {}),
    ...(item.region != null ? { region: item.region } : {}),
    ...(item.exif != null ? { exif: item.exif } : {}),
    rationale: item.rationale,
    ...(item.marginal != null ? { marginal: item.marginal } : {}),
    ...(item.proxy != null ? { proxy: item.proxy } : {}),
    ...(item.citation != null ? { citation: item.citation } : {}),
  };
}

function toFinding(
  read: AttributeFindingRead,
  reliability: NonNullable<typeof read.reliability>,
): LocationFinding {
  return {
    code: read.code,
    label: read.label,
    value: read.value,
    precision: read.precision ?? null,
    neighborhood: read.neighborhood ?? null,
    reliability: Math.round(reliability.point * 100),
    lo: Math.round(reliability.lo * 100),
    hi: Math.round(reliability.hi * 100),
    sev: read.severity,
    reasoning: read.reasoning,
    candidates: read.candidates,
    ...(read.text_only_reliability != null
      ? { textOnlyReliability: Math.round(read.text_only_reliability.point * 100) }
      : {}),
  };
}

/**
 * One inference's attribution detail — `GET /v1/inferences/{id}` (live at BE #55).
 * Returns null when the inference is absent/not the caller's (the backend 404s — RLS-scoped,
 * no IDOR signal) or when it carries no calibrated reliability yet (transitional fail-closed:
 * we never render an uncalibrated number as if calibrated).
 */
export async function getAttributionDetail(inferenceId: string): Promise<AttributionDetail | null> {
  const { token, devUserId } = await backendAuth();
  const { data, error, response } = await getInferenceV1InferencesInferenceIdGet({
    path: { inference_id: inferenceId },
    auth: token,
    headers: devUserId ? { "x-dev-user-id": devUserId } : undefined,
  });
  if (error || !data) {
    const backendError = toBackendError(error, response);
    if (backendError.status === 404) return null;
    throw backendError;
  }
  const read = zGetInferenceV1InferencesInferenceIdGetResponse.parse(data); // wire boundary
  if (read.reliability == null) return null;
  return {
    finding: toFinding(read, read.reliability),
    evidence: read.evidence_items.map(toEvidenceItem),
    masked: read.art9 === true && read.value === null,
  };
}
