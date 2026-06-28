import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";

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

export function CalibrationSection({ loading }: { loading: boolean }) {
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
            <CalibrationChart />
          </div>
          <div>
            <div className="calib-callout-box">
              <div className="calib-callout-eq">0.80 predicted → 0.76 actual</div>
              <div className="calib-callout-t">
                For location, a guess the model rates 0.80 turns out right about 76% of the time.
                The dashed line is perfect calibration; our curve sits just under it — slightly
                humble, never overconfident.
              </div>
            </div>
            <div className="calib-ece">
              <span className="calib-ece-v">0.04</span>
              <span className="calib-ece-l">
                Expected calibration error across attributes. The closer the curve hugs the
                diagonal, the lower this is.
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
