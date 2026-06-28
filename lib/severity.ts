import type { IconName } from "@/lib/icons";
import type { AttrItem, DisplaySeverity, Lens, SeverityLevel } from "@/lib/schemas/attribute";

export const SEV_RANK: Record<DisplaySeverity, number> = {
  extreme: 4,
  high: 3,
  moderate: 2,
  low: 1,
  abstain: -1,
};

/** Label + Lucide icon per level. Severity is never color-only (icon + label always). */
export const SEV_META: Record<DisplaySeverity, { label: string; icon: IconName }> = {
  low: { label: "Low", icon: "shield-check" },
  moderate: { label: "Moderate", icon: "circle-alert" },
  high: { label: "High", icon: "triangle-alert" },
  extreme: { label: "Extreme", icon: "octagon-alert" },
  abstain: { label: "No signal", icon: "circle-minus" },
};

function maxLevel(a: SeverityLevel, b: SeverityLevel): SeverityLevel {
  return SEV_RANK[a] >= SEV_RANK[b] ? a : b;
}

/** Lens-relative severity. Balanced = safety-aware max across personas (persona-lens.md). */
export function severityFor(attr: AttrItem, lens: Lens): DisplaySeverity {
  if (attr.abstain) return "abstain";
  if (lens === "balanced") return maxLevel(attr.sev.atrisk, attr.sev.jobseeker);
  if (lens === "atrisk") return attr.sev.atrisk;
  return attr.sev.jobseeker;
}

/** Order by lens severity desc, then calibrated reliability desc; abstain sinks last. */
export function orderFor(attrs: AttrItem[], lens: Lens): AttrItem[] {
  return attrs.slice().sort((a, b) => {
    const ra = SEV_RANK[severityFor(a, lens)];
    const rb = SEV_RANK[severityFor(b, lens)];
    if (rb !== ra) return rb - ra;
    return (b.reliability ?? 0) - (a.reliability ?? 0);
  });
}

/** Count of attributes with a usable signal (i.e. not abstaining). */
export function inferredCount(attrs: AttrItem[]): number {
  return attrs.filter((a) => !a.abstain).length;
}
