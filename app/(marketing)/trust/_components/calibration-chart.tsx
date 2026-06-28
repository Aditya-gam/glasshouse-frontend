import { CALIB } from "@/lib/fixtures/trust";

/**
 * SVG reliability diagram: predicted reliability vs measured accuracy for location.
 * `role="img"` + a spoken summary; the underlying data table is the M5.7 a11y add
 * (HANDOFF §6 gap #4).
 */
export function CalibrationChart() {
  const X0 = 30;
  const X1 = 190;
  const Y0 = 170;
  const Y1 = 10;
  const px = (p: number) => X0 + p * (X1 - X0);
  const py = (e: number) => Y0 - e * (Y0 - Y1);
  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const pts = CALIB.map(([p, e]) => `${px(p).toFixed(1)},${py(e).toFixed(1)}`).join(" ");
  const hi = CALIB.find(([p]) => p === 0.8);

  return (
    <svg
      className="calib-svg"
      viewBox="0 0 200 200"
      role="img"
      aria-label="Calibration reliability diagram: predicted reliability versus measured accuracy for location. A 0.80 prediction is right about 0.76 of the time."
    >
      {ticks.map((t) => (
        <g key={t}>
          <line x1={px(t)} y1={Y1} x2={px(t)} y2={Y0} stroke="var(--border)" strokeWidth="0.5" />
          <line x1={X0} y1={py(t)} x2={X1} y2={py(t)} stroke="var(--border)" strokeWidth="0.5" />
          <text className="calib-tick" x={px(t)} y={Y0 + 9} textAnchor="middle">
            {t.toFixed(2)}
          </text>
          <text className="calib-tick" x={X0 - 5} y={py(t) + 3} textAnchor="end">
            {t.toFixed(2)}
          </text>
        </g>
      ))}
      <line
        x1={px(0)}
        y1={py(0)}
        x2={px(1)}
        y2={py(1)}
        stroke="var(--subtle-foreground)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <polyline
        points={pts}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {CALIB.map(([p, e]) => (
        <circle key={p} cx={px(p)} cy={py(e)} r="2.4" fill="var(--primary)" />
      ))}
      {hi && (
        <>
          <circle
            cx={px(0.8)}
            cy={py(hi[1])}
            r="4"
            fill="none"
            stroke="var(--accent-text)"
            strokeWidth="1.5"
          />
          <line
            x1={px(0.8)}
            y1={py(hi[1])}
            x2={px(0.8)}
            y2={Y0}
            stroke="var(--accent-text)"
            strokeWidth="0.5"
            strokeDasharray="2 2"
          />
        </>
      )}
      <text className="calib-axis-label" x={(X0 + X1) / 2} y="194" textAnchor="middle">
        Predicted reliability
      </text>
      <text
        className="calib-axis-label"
        x="10"
        y={(Y0 + Y1) / 2}
        textAnchor="middle"
        transform={`rotate(-90 10 ${(Y0 + Y1) / 2})`}
      >
        Measured accuracy
      </text>
    </svg>
  );
}
