import { Icon } from "@/components/ui/icon";
import type { EvidenceKind } from "@/lib/fixtures/attribution";

/** Proven (causal/ablation) vs Likely (correlational/attack-side) — badge + fill +
 *  (in the span styles) underline, so it's never color-alone. */
export function KindBadge({ kind }: { kind: EvidenceKind }) {
  if (kind === "proven") {
    return (
      <span className="ev-kind ev-kind--proven">
        <Icon name="check" size={12} stroke={2.5} /> Proven
      </span>
    );
  }
  return (
    <span className="ev-kind ev-kind--likely">
      <Icon name="circle-alert" size={12} /> Likely
    </span>
  );
}
