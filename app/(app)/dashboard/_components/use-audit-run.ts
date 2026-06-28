"use client";

import { useEffect, useRef, useState } from "react";

export interface AuditRun {
  stage: number;
  revealed: number;
  status: "running" | "done";
}

const TICK_MS = 70;

/**
 * Drives the attack-run simulation off a tick counter (robust to background-tab
 * throttling; no `Date.now()` so it stays render-pure). Cards stream in as `revealed`
 * grows across retrieve → infer → calibrate. Calls `onDone` when calibrate finishes.
 */
export function useAuditRun(active: boolean, onDone: () => void): AuditRun {
  const [run, setRun] = useState<AuditRun>({ stage: 0, revealed: 0, status: "running" });
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    if (!active) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tRetrieve = reduce ? 500 : 1200;
    const tInfer = reduce ? 1100 : 3500;
    const tCalib = reduce ? 1500 : 5300;
    let t = 0;
    const id = setInterval(() => {
      t += TICK_MS;
      if (t >= tCalib) {
        clearInterval(id);
        setRun({ stage: 2, revealed: 8, status: "done" });
        doneRef.current();
        return;
      }
      let stage = 0;
      let revealed = 0;
      if (t < tRetrieve) {
        stage = 0;
        revealed = 0;
      } else if (t < tInfer) {
        stage = 1;
        revealed = Math.floor(((t - tRetrieve) / (tInfer - tRetrieve)) * 8);
      } else {
        stage = 2;
        revealed = Math.min(8, 5 + Math.floor(((t - tInfer) / (tCalib - tInfer)) * 3));
      }
      setRun({ stage, revealed, status: "running" });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [active]);

  return run;
}
