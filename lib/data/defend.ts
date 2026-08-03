import "server-only";

import { getDefendFrontier, type RemediationStatus } from "@/lib/dal/remediations";
import { ATTRIBUTES } from "@/lib/fixtures/attributes";
import { DECOY_BACKFIRE, OPTIONS, TARGET } from "@/lib/fixtures/defend";
import type { DefendOption, DefendTarget } from "@/lib/fixtures/defend";

export interface DefendSimulation {
  target: DefendTarget;
  options: DefendOption[];
  decoyBackfire: typeof DECOY_BACKFIRE;
  /** Present only for LIVE data — the run's honest outcome drives the screen state. */
  liveStatus?: RemediationStatus;
}

/** The FE taxonomy label for a wire attribute code ("location" → "Current location"). */
function labelFor(code: string): string {
  return ATTRIBUTES.find((attr) => attr.code === code)?.label ?? code;
}

/**
 * The defend frontier — LIVE from `GET /v1/remediations?inference_id=` (BE M3.8) when an
 * inference id is available, behind the accessor so `DefendView` stays unchanged.
 *
 * The id arrives via the page (today: the `?inference=` search param — the attribution
 * screen will pass it once the read contract exposes inference ids; that gap is flagged
 * cross-repo). Without an id, or when live data is unavailable (backend down, no
 * credential), this serves the typed fixtures and logs the reason. `decoyBackfire` is
 * FE-owned persona copy (ethics-and-tone) and always comes from the fixtures.
 */
export async function getDefendSimulation(inferenceId?: string): Promise<DefendSimulation> {
  if (inferenceId) {
    try {
      const frontier = await getDefendFrontier(inferenceId);
      if (frontier) {
        return {
          target: { ...frontier.target, attribute: labelFor(frontier.target.attribute) },
          options: frontier.options,
          decoyBackfire: DECOY_BACKFIRE,
          liveStatus: frontier.status,
        };
      }
      console.warn("[data/defend] no frontier for inference", inferenceId, "- serving fixtures");
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn("[data/defend] live frontier unavailable - serving fixtures:", reason);
    }
  }
  return { target: TARGET, options: OPTIONS, decoyBackfire: DECOY_BACKFIRE };
}
