import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import type { CalibPoint } from "@/lib/fixtures/trust";

import { CalibrationChart } from "./calibration-chart";

function CalibSkeleton() {
  return (
    <div className="calib-grid" aria-hidden="true">
      <div className="calib-card">
        <Skeleton className="skc-square" />
      </div>
      <div>
        <Skeleton className="skc-callout" />
        <Skeleton className="skc-ece" />
      </div>
    </div>
  );
}

/** The curve point at (or nearest below) 0.80 predicted — the worked example in the callout. */
function calloutPoint(calib: CalibPoint[]): CalibPoint | undefined {
  return (
    calib.find(([p]) => Math.abs(p - 0.8) < 1e-9) ??
    [...calib].sort((a, b) => Math.abs(a[0] - 0.8) - Math.abs(b[0] - 0.8))[0]
  );
}

/** Mean |predicted − measured| across buckets (unweighted — the wire carries no bucket sizes). */
function meanGap(calib: CalibPoint[]): number {
  return calib.reduce((sum, [p, e]) => sum + Math.abs(p - e), 0) / calib.length;
}

export function CalibrationSection({
  loading,
  calib,
}: Readonly<{ loading: boolean; calib: CalibPoint[] }>) {
  const callout = calloutPoint(calib);
  return (
    <section className="trust-sec">
      <p className="sec-eyebrow">
        <Icon name="gauge" size={14} /> Calibration
      </p>
      <h2 className="trust-h2">A score that means what it says</h2>
      <p className="trust-p">
        A model saying &ldquo;0.8&rdquo; is meaningless until you check how often a 0.8 is actually
        right. We bucket every guess by confidence and measure the real hit-rate — per attribute —
        then show you <b>that</b> number, not the model&rsquo;s raw output.
      </p>
      {loading ? (
        <CalibSkeleton />
      ) : (
        <div className="calib-grid">
          <div className="calib-card">
            <CalibrationChart calib={calib} />
          </div>
          <div>
            {callout && (
              <div className="calib-callout-box">
                <div className="calib-callout-eq">
                  {callout[0].toFixed(2)} predicted → {callout[1].toFixed(2)} actual
                </div>
                <div className="calib-callout-t">
                  A guess the model rates {callout[0].toFixed(2)} turns out right about{" "}
                  {Math.round(callout[1] * 100)}% of the time. The dashed line is perfect
                  calibration; a curve just under it is slightly humble, never overconfident.
                </div>
              </div>
            )}
            {calib.length > 0 && (
              <div className="calib-ece">
                <span className="calib-ece-v">{meanGap(calib).toFixed(2)}</span>
                <span className="calib-ece-l">
                  Mean gap between predicted and measured across buckets. The closer the curve hugs
                  the diagonal, the lower this is.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
