import "server-only";

import { DECOY_BACKFIRE, OPTIONS, TARGET } from "@/lib/fixtures/defend";

/** The defend simulation for the location target. M5.5: typed fixtures; M5.4 swaps to
 *  the generated client + DAL (real independent-adversary re-attack results). */
export async function getDefendSimulation() {
  return { target: TARGET, options: OPTIONS, decoyBackfire: DECOY_BACKFIRE };
}
