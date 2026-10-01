import "server-only";

import { evalCalibrationV1EvalCalibrationGet } from "@/lib/api";
import { zEvalCalibrationV1EvalCalibrationGetResponse } from "@/lib/api/zod.gen";
import type { BenchRow, CalibPoint } from "@/lib/fixtures/trust";

import { toBackendError } from "./backend";

/**
 * Eval DAL — `GET /v1/eval/calibration` (live at BE M2/#54). One call carries both halves
 * of the trust screen: per-attribute benchmark rows and the pooled reliability curve, for
 * the same engine version. Public by design (no auth): the numbers are non-personal
 * SynthPAI benchmark results, so no credential is attached.
 */

export interface Benchmark {
  bench: BenchRow[];
  calib: CalibPoint[];
}

/** Wire attribute code → display label ("location" → "Location"). */
function labelize(code: string): string {
  return code.charAt(0).toUpperCase() + code.slice(1);
}

/** The latest benchmark. Accuracy is 0..1 on the wire; the UI renders %. Empty until an eval runs. */
export async function getBenchmark(): Promise<Benchmark> {
  const { data, error, response } = await evalCalibrationV1EvalCalibrationGet();
  if (error || !data) throw toBackendError(error, response);
  const read = zEvalCalibrationV1EvalCalibrationGetResponse.parse(data); // wire boundary
  return {
    bench: read.rows.map((row) => ({
      label: labelize(row.label),
      top1: Math.round(row.top1 * 100),
      top3: Math.round(row.top3 * 100),
    })),
    calib: read.calibration.map(([predicted, empirical]) => [predicted, empirical] as CalibPoint),
  };
}
