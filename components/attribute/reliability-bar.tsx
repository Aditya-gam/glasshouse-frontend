import "./attribute.css";

interface ReliabilityBarProps {
  point: number;
  lo: number;
  hi: number;
}

/** Calibrated reliability: a teal point estimate over its calibrated interval band.
 *  Exposed to assistive tech as an image with a spoken label. */
export function ReliabilityBar({ point, lo, hi }: ReliabilityBarProps) {
  const bandLeft = Math.max(0, Math.min(100, lo));
  const bandWidth = Math.max(0, Math.min(100, hi) - bandLeft);
  return (
    <div
      className="relbar"
      role="img"
      aria-label={`Calibrated reliability ${point} percent, interval ${lo} to ${hi} percent`}
    >
      <div className="relbar-band" style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }} />
      <div className="relbar-fill" style={{ width: `${point}%` }} />
    </div>
  );
}
