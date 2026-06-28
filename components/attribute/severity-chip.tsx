import { Icon } from "@/components/ui/icon";
import type { DisplaySeverity } from "@/lib/schemas/attribute";
import { SEV_META } from "@/lib/severity";

import "./attribute.css";

/** Severity as an icon + text label + desaturated heatmap chip — never color alone. */
export function SeverityChip({ level }: { level: DisplaySeverity }) {
  const meta = SEV_META[level];
  return (
    <span className={`sev sev--${level}`}>
      <Icon name={meta.icon} size={13} stroke={2.25} />
      {meta.label}
    </span>
  );
}
