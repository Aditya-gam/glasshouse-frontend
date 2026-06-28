import type { ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PageHeadProps {
  sub: ReactNode;
  showCalib: boolean;
}

export function PageHead({ sub, showCalib }: PageHeadProps) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">Your footprint</h1>
        <p className="page-sub">{sub}</p>
      </div>
      {showCalib && (
        <span className="calib">
          <span className="calib-dot" />
          Calibrated reliability
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="info-btn" aria-label="What is calibrated reliability?">
                <Icon name="info" size={15} />
              </TooltipTrigger>
              <TooltipContent className="max-w-[252px]">
                Calibrated reliability is how often a guess like this is actually right in testing —
                not the model&rsquo;s raw confidence. The bar shows the calibrated interval.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </span>
      )}
    </div>
  );
}
