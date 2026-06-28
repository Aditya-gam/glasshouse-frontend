"use client";

import { useEffect, useRef, useState } from "react";

export interface DefendRun {
  stage: number;
  status: "running" | "done";
}

const TICK_MS = 80;

/** Defend run sim (find minimal set → draft edits → re-attack & prove). Tick-based
 *  (no `Date.now()`), longer than a scan. Calls `onDone` when the re-attack finishes. */
export function useDefendRun(active: boolean, onDone: () => void): DefendRun {
  const [run, setRun] = useState<DefendRun>({ stage: 0, status: "running" });
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  useEffect(() => {
    if (!active) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ends = reduce ? [600, 1200, 1800] : [2200, 4600, 7200];
    let t = 0;
    const id = setInterval(() => {
      t += TICK_MS;
      if (t >= ends[2]) {
        clearInterval(id);
        setRun({ stage: 2, status: "done" });
        doneRef.current();
        return;
      }
      let stage = 2;
      if (t < ends[0]) stage = 0;
      else if (t < ends[1]) stage = 1;
      setRun({ stage, status: "running" });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [active]);

  return run;
}
