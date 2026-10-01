import "server-only";

import { getAttributionDetail, listInferences } from "@/lib/dal/inferences";
import {
  EVIDENCE,
  GENERIC_WHY,
  LOCATION,
  LOCATION_WHY,
  type EvidenceItem,
  type LocationFinding,
} from "@/lib/fixtures/attribution";
import type { Lens } from "@/lib/schemas/attribute";

export interface Attribution {
  finding: LocationFinding;
  why: Record<Lens, string>;
  evidence: EvidenceItem[];
  /** Art. 9 finding served consent-masked (value/reasoning/evidence rationale withheld). */
  masked: boolean;
  /** The live inference id — threads the dashboard → attribution → defend handoff. */
  inferenceId?: string;
  /** Set when the honest screen state is predetermined (no signal / no run for this code). */
  state?: "empty";
}

const FIXTURES: Attribution = {
  finding: LOCATION,
  why: LOCATION_WHY,
  evidence: EVIDENCE,
  masked: false,
};

/**
 * The attribution detail for one attribute code — LIVE via `GET /v1/inferences` (to resolve
 * the code → the latest inference id) then `GET /v1/inferences/{id}` (BE #55), behind the
 * accessor so `AttributionView` stays unchanged.
 *
 * Honest states, in order: no inference / abstained / uncalibrated → "empty" (never a guess);
 * Art. 9 without consent → served masked (a real state with a consent affordance, not an
 * error). Fixtures only when the backend is unreachable — the location demo for `location`,
 * the abstained empty state for other codes (matching the pre-live demo behavior).
 */
export async function getAttribution(code: string): Promise<Attribution> {
  try {
    const items = await listInferences();
    const item = items.find((candidate) => candidate.code === code);
    if (!item?.id || item.abstain) return { ...FIXTURES, state: "empty" };
    const detail = await getAttributionDetail(item.id);
    if (!detail) return { ...FIXTURES, state: "empty" };
    return {
      finding: detail.finding,
      why: code === "location" ? LOCATION_WHY : GENERIC_WHY,
      evidence: detail.evidence,
      masked: detail.masked,
      inferenceId: item.id,
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn("[data/attribution] live detail unavailable - serving fixtures:", reason);
    return code === "location" ? FIXTURES : { ...FIXTURES, state: "empty" };
  }
}
