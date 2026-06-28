import { Fragment } from "react";

import type { DiffSeg } from "@/lib/fixtures/defend";

/** Renders a rewrite/decoy diff: deletions struck through, insertions highlighted,
 *  inserted falsehoods (insf) in amber. */
export function DiffText({ segs }: Readonly<{ segs: DiffSeg[] }>) {
  return (
    <p className="diff-text">
      {segs.map((s, i) => {
        const key = `${s.t}-${i}-${s.v}`;
        if (s.t === "del") return <del key={key}>{s.v}</del>;
        if (s.t === "ins") return <ins key={key}>{s.v}</ins>;
        if (s.t === "insf")
          return (
            <ins key={key} className="ins-false">
              {s.v}
            </ins>
          );
        return <Fragment key={key}>{s.v}</Fragment>;
      })}
    </p>
  );
}
