import "server-only";

import { getBenchmark } from "@/lib/dal/eval";
import { BENCH, CALIB, type BenchRow, type CalibPoint } from "@/lib/fixtures/trust";

export interface TrustBenchmark {
  bench: BenchRow[];
  calib: CalibPoint[];
  /** True when the numbers came from the live eval endpoint (not the fixture demo). */
  live: boolean;
}

/**
 * The trust screen's benchmark — LIVE from `GET /v1/eval/calibration` (BE #54), behind the
 * accessor. A LIVE EMPTY result is real ("no benchmark run yet") and must surface the
 * screen's empty state — never the fixture demo numbers. Only when the backend is
 * unreachable does this fall back to the illustrative fixtures (and logs why).
 */
export async function getTrustBenchmark(): Promise<TrustBenchmark> {
  try {
    const { bench, calib } = await getBenchmark();
    return { bench, calib, live: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn("[data/trust] live benchmark unavailable - serving fixtures:", reason);
    return { bench: BENCH, calib: CALIB, live: false };
  }
}
