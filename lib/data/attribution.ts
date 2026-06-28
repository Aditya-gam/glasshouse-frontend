import "server-only";

import { EVIDENCE, LOCATION, LOCATION_WHY } from "@/lib/fixtures/attribution";

/** The location attribution detail. M5.5: typed fixtures; M5.4 swaps to the generated
 *  client + DAL. Only `location` is fully wired (HANDOFF §7). */
export async function getLocationAttribution() {
  return { finding: LOCATION, why: LOCATION_WHY, evidence: EVIDENCE };
}
