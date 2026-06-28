"use client";

import { Icon } from "@/components/ui/icon";
import type { DefendOption } from "@/lib/fixtures/defend";

interface FrontierOptionProps {
  opt: DefendOption;
  selected: boolean;
  decoyEnabled: boolean;
  onSelect: (opt: DefendOption) => void;
}

export function FrontierOption({ opt, selected, decoyEnabled, onSelect }: FrontierOptionProps) {
  const cls = ["opt", selected && "opt--selected", opt.key === "decoy" && "opt--decoy"]
    .filter(Boolean)
    .join(" ");
  return (
    <button
      type="button"
      className={cls}
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(opt)}
    >
      <div className="opt-head">
        <span className="opt-name">{opt.name}</span>
        {opt.recommended && <span className="opt-tag opt-tag--rec">Recommended</span>}
        {opt.optIn && !decoyEnabled && (
          <span className="opt-tag opt-tag--lock">
            <Icon name="lock" size={11} /> Opt-in
          </span>
        )}
      </div>
      <div className="opt-after">
        <span className="opt-after-num">{opt.after.toFixed(2)}</span>
        <span className="opt-after-ci">
          [{opt.lo.toFixed(2)}–{opt.hi.toFixed(2)}]
        </span>
      </div>
      <div className="opt-util">
        {opt.utility !== null && opt.utility > 0 && (
          <>
            <div className="opt-util-bar">
              <div className="opt-util-fill" style={{ width: `${opt.utility}%` }} />
            </div>
            <div className="opt-util-label">
              <span>{opt.utilityLabel}</span>
              <span className="opt-util-pct">{opt.utility}%</span>
            </div>
          </>
        )}
        {opt.utility === 0 && (
          <div className="opt-util-label">
            <span>{opt.utilityLabel}</span>
          </div>
        )}
        {opt.utility === null && (
          <div className="opt-util-label">
            <span style={{ color: "var(--warning-foreground)" }}>{opt.utilityLabel}</span>
          </div>
        )}
      </div>
      <p className="opt-desc">{opt.desc}</p>
    </button>
  );
}
