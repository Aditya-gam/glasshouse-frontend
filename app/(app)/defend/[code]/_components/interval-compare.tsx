import { Icon } from "@/components/ui/icon";
import { NOISE } from "@/lib/fixtures/defend";

/** Before/after interval-overlap chart on a zoomed [0.6, 1.0] domain, so the overlap
 *  (the "drop sits inside run-to-run noise") is legible — and honest. */
export function IntervalCompare() {
  const D0 = 0.6;
  const D1 = 1;
  const x = (v: number) => ((v - D0) / (D1 - D0)) * 100;
  const oLo = Math.max(NOISE.afterLo, NOISE.beforeLo);
  const oHi = Math.min(NOISE.afterHi, NOISE.beforeHi);

  return (
    <div className="ivl">
      <div className="ivl-row">
        <span className="ivl-label">Before</span>
        <span className="ivl-track">
          <span className="ivl-axis" />
          <span
            className="ivl-overlap"
            style={{ left: `${x(oLo)}%`, width: `${x(oHi) - x(oLo)}%` }}
          />
          <span
            className="ivl-band ivl-band--before"
            style={{
              left: `${x(NOISE.beforeLo)}%`,
              width: `${x(NOISE.beforeHi) - x(NOISE.beforeLo)}%`,
            }}
          />
          <span className="ivl-point ivl-point--before" style={{ left: `${x(NOISE.before)}%` }} />
        </span>
        <span className="ivl-vals">
          {NOISE.before.toFixed(2)}{" "}
          <span className="ivl-pt">
            [{NOISE.beforeLo.toFixed(2)}–{NOISE.beforeHi.toFixed(2)}]
          </span>
        </span>
      </div>
      <div className="ivl-row">
        <span className="ivl-label">After</span>
        <span className="ivl-track">
          <span className="ivl-axis" />
          <span
            className="ivl-overlap"
            style={{ left: `${x(oLo)}%`, width: `${x(oHi) - x(oLo)}%` }}
          />
          <span
            className="ivl-band ivl-band--after"
            style={{
              left: `${x(NOISE.afterLo)}%`,
              width: `${x(NOISE.afterHi) - x(NOISE.afterLo)}%`,
            }}
          />
          <span className="ivl-point ivl-point--after" style={{ left: `${x(NOISE.after)}%` }} />
        </span>
        <span className="ivl-vals">
          {NOISE.after.toFixed(2)}{" "}
          <span className="ivl-pt">
            [{NOISE.afterLo.toFixed(2)}–{NOISE.afterHi.toFixed(2)}]
          </span>
        </span>
      </div>
      <div className="ivl-scale">
        <span>0.60</span>
        <span>1.00</span>
      </div>
      <div className="ivl-foot">
        <Icon name="circle-alert" size={14} /> The intervals overlap — the &ldquo;drop&rdquo; sits
        inside run-to-run noise.
      </div>
    </div>
  );
}
