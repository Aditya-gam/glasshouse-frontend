import { Fragment } from "react";

import type { DiffSeg } from "@/lib/fixtures/defend";

/** Renders a rewrite/decoy diff: deletions struck through, insertions highlighted,
 *  inserted falsehoods (insf) in amber. */
export function DiffText({ segs }: { segs: DiffSeg[] }) {
  return (
    <p className="diff-text">
      {segs.map((s, i) => {
        if (s.t === "del") return <del key={i}>{s.v}</del>;
        if (s.t === "ins") return <ins key={i}>{s.v}</ins>;
        if (s.t === "insf")
          return (
            <ins key={i} className="ins-false">
              {s.v}
            </ins>
          );
        return <Fragment key={i}>{s.v}</Fragment>;
      })}
    </p>
  );
}
