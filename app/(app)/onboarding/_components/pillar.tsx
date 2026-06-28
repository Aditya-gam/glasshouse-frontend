import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import type { IconName } from "@/lib/icons";

interface PillarProps {
  step: string;
  title: string;
  icon: IconName;
  children: ReactNode;
}

/** One Attack/Measure/Defend pillar on the welcome step. */
export function Pillar({ step, title, icon, children }: PillarProps) {
  return (
    <div className="pillar">
      <div className="pillar-ic">
        <Icon name={icon} size={18} />
      </div>
      <div>
        <div className="pillar-head">
          <span className="pillar-step">{step}</span>
          <span className="pillar-t">{title}</span>
        </div>
        <p className="pillar-d">{children}</p>
      </div>
    </div>
  );
}
