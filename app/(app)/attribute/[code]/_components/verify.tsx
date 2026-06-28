"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

const REASONS = ["Wrong city", "Outdated", "Never lived here", "Too precise"];

/** Confirm/deny the inference. Verification feeds calibration/drift only — it never
 *  changes what others can infer (stated plainly). */
export function Verify() {
  const [state, setState] = useState<null | "confirmed" | "denied">(null);
  const [reason, setReason] = useState<string | null>(null);

  if (state === "confirmed") {
    return (
      <div>
        <div className="verify-result verify-result--ok">
          <Icon name="check" size={16} stroke={2.5} />
          <span>
            You confirmed this is right. Thanks — verification improves our calibration; it
            doesn&rsquo;t change what others can infer.
          </span>
        </div>
        <button type="button" className="verify-undo" onClick={() => setState(null)}>
          Undo
        </button>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div>
        <div className="verify-result verify-result--no">
          <Icon name="circle-minus" size={16} />
          <span>
            Recorded as not right{reason ? ` — ${reason.toLowerCase()}` : ""}. This feeds our drift
            monitoring. To reduce real exposure, break the inference.
          </span>
        </div>
        <div className="verify-reasons" role="group" aria-label="What's wrong?">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              className="reason-chip"
              aria-pressed={reason === r}
              onClick={() => setReason(r)}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="verify-undo"
          onClick={() => {
            setState(null);
            setReason(null);
          }}
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="verify-q">Is this right?</div>
      <p className="verify-note">
        Verifying helps us calibrate and catch drift. It won&rsquo;t change what others can infer.
      </p>
      <div className="verify-actions">
        <Button variant="secondary" onClick={() => setState("confirmed")}>
          <Icon name="check" size={15} /> Confirm
        </Button>
        <Button variant="outline" onClick={() => setState("denied")}>
          <Icon name="x" size={15} /> Not right
        </Button>
      </div>
    </div>
  );
}
