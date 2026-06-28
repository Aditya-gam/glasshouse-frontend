import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

import { IntervalCompare } from "./interval-compare";

/** Honest "within noise" outcome — never implies safety. */
export function NotProvenResult({
  onStronger,
  onRemove,
}: {
  onStronger: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="result result--inconclusive">
      <span className="result-flag result-flag--inconclusive">
        <Icon name="circle-alert" size={14} /> Not proven — within noise
      </span>
      <h2 className="result-head">We couldn&rsquo;t prove a real drop</h2>
      <p className="result-body">
        This edit nudged the number down, but not beyond what we&rsquo;d see just from re-running
        the same attack twice. We won&rsquo;t call that a win. <b>Your city is still recoverable</b>{" "}
        — treat this as no change, not a safe result.
      </p>
      <IntervalCompare />
      <div className="result-next">
        <div className="result-next-label">Honest next steps</div>
        <div className="result-next-row">
          <Button onClick={onStronger}>
            Try a stronger edit <Icon name="arrow-right" size={15} />
          </Button>
          <Button variant="secondary" onClick={onRemove}>
            <Icon name="trash-2" size={15} /> Remove the post instead
          </Button>
        </div>
      </div>
    </div>
  );
}
