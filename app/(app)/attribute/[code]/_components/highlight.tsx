import type { ReactNode } from "react";

/** Wrap each quoted substring in a styled <mark>; non-overlapping, left-to-right. */
export function highlight(text: string, quotes: string[] | undefined, klass: string): ReactNode[] {
  const ranges: { start: number; end: number }[] = [];
  (quotes ?? []).forEach((q) => {
    let idx = text.indexOf(q);
    while (idx !== -1 && ranges.some((r) => idx < r.end && idx + q.length > r.start)) {
      idx = text.indexOf(q, idx + 1);
    }
    if (idx !== -1) ranges.push({ start: idx, end: idx + q.length });
  });
  ranges.sort((a, b) => a.start - b.start);

  const out: ReactNode[] = [];
  let pos = 0;
  ranges.forEach((r, i) => {
    if (r.start > pos) out.push(text.slice(pos, r.start));
    out.push(
      <mark key={i} className={klass}>
        {text.slice(r.start, r.end)}
      </mark>,
    );
    pos = r.end;
  });
  if (pos < text.length) out.push(text.slice(pos));
  return out;
}
