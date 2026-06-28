/** SynthPAI measured accuracy (text) — synthetic, human-verified labels (no real
 *  people). top-1 = single best guess; top-3 = correct within three. Illustrative
 *  figures until a real eval runs (HANDOFF §7). */
export interface BenchRow {
  label: string;
  top1: number;
  top3: number;
}

export const BENCH: BenchRow[] = [
  { label: "Sex", top1: 88, top3: 96 },
  { label: "Location", top1: 84, top3: 94 },
  { label: "Age", top1: 71, top3: 89 },
  { label: "Occupation", top1: 78, top3: 91 },
  { label: "Relationship", top1: 74, top3: 88 },
  { label: "Education", top1: 69, top3: 86 },
  { label: "Birthplace", top1: 61, top3: 79 },
  { label: "Income", top1: 52, top3: 74 },
];

/** Reliability-diagram points for location: [predicted, empirical] in 0..1. */
export type CalibPoint = [predicted: number, empirical: number];

export const CALIB: CalibPoint[] = [
  [0.1, 0.09],
  [0.2, 0.18],
  [0.3, 0.27],
  [0.4, 0.37],
  [0.5, 0.47],
  [0.6, 0.55],
  [0.7, 0.66],
  [0.8, 0.76],
  [0.9, 0.85],
];
