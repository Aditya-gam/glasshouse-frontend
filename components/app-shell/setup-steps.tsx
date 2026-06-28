import { Fragment } from "react";

import { Icon } from "@/components/ui/icon";

import "./app-shell.css";

const SETUP_STEPS = [
  { key: "setup", label: "Set up" },
  { key: "connect", label: "Connect" },
  { key: "audit", label: "Audit" },
] as const;

export type SetupStep = (typeof SETUP_STEPS)[number]["key"];

/** Step indicator for the onboarding → connect → audit setup path. */
export function SetupSteps({ active }: { active: SetupStep }) {
  const idx = SETUP_STEPS.findIndex((s) => s.key === active);
  return (
    <nav className="setup-steps" aria-label="Setup progress">
      {SETUP_STEPS.map((s, i) => {
        let state: "done" | "current" | "todo" = "todo";
        if (i < idx) state = "done";
        else if (i === idx) state = "current";
        return (
          <Fragment key={s.key}>
            <span
              className="setup-step"
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="setup-step-dot">
                {state === "done" ? <Icon name="check" size={11} stroke={3} /> : i + 1}
              </span>
              <span className="setup-step-label">{s.label}</span>
            </span>
            {i < SETUP_STEPS.length - 1 && (
              <span className="setup-step-conn" data-done={i < idx} aria-hidden="true" />
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
