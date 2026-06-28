"use client";

import { Fragment, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";

import "./states.css";

interface RunProgressProps {
  stages: string[];
  title?: string;
  current?: number;
  status?: "running" | "polling" | "done";
  hint?: string;
  onCancel?: () => void;
}

/**
 * Async run progress — SSE-with-polling-fallback aware (the "Live / Reconnecting"
 * indicator). `role="status" aria-live="polite"` so stage changes are announced.
 * Presentational; the run is driven by the caller.
 */
export function RunProgress({
  title = "Running…",
  stages,
  current = 0,
  status = "running",
  hint,
  onCancel,
}: RunProgressProps) {
  const pct = Math.max(
    0,
    Math.min(100, ((current + (status === "done" ? 1 : 0.5)) / stages.length) * 100),
  );
  return (
    <div className="runprog" role="status" aria-live="polite">
      <div className="runprog-head">
        <span className="runprog-title">{title}</span>
        <span className="runprog-conn" data-status={status}>
          <span className="runprog-conn-dot" />
          {status === "polling" ? "Reconnecting — polling" : "Live"}
        </span>
        {onCancel && (
          <button type="button" className="runprog-cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
      <div className="runprog-stages">
        {stages.map((label, i) => {
          let state: "done" | "active" | "todo" = "todo";
          if (i < current) state = "done";
          else if (i === current) state = "active";

          let dot: ReactNode = i + 1;
          if (state === "done") dot = <Icon name="check" size={14} stroke={2.5} />;
          else if (state === "active") dot = <span className="rp-spin" aria-hidden="true" />;

          return (
            <Fragment key={label}>
              <div className="rp-stage" data-state={state}>
                <span className="rp-dot">{dot}</span>
                <span className="rp-label">{label}</span>
              </div>
              {i < stages.length - 1 && <span className="rp-conn" data-done={i < current} />}
            </Fragment>
          );
        })}
      </div>
      <div className="runprog-bar">
        <div className="runprog-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="runprog-hint">
        {hint ||
          "This can take a moment. Keep this tab open, or come back later — we'll keep running."}
      </p>
    </div>
  );
}
