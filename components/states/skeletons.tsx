import { Skeleton } from "@/components/ui/skeleton";

import "./states.css";

/** Skeleton compositions mirroring the real card / row / chart layouts so the
 *  loading shape matches the loaded shape (less layout shift). */

export function SkelCard() {
  return (
    <div className="skel-card">
      <div className="skel-head">
        <Skeleton className="skc-label" />
        <Skeleton className="skc-chip" />
      </div>
      <Skeleton className="skc-value" />
      <Skeleton className="skc-bar" />
      <Skeleton className="skc-range" />
      <div className="skel-foot">
        <Skeleton className="skc-foot-l" />
        <Skeleton className="skc-foot-btn" />
      </div>
    </div>
  );
}

export function SkelRow() {
  return (
    <div className="skel-row">
      <Skeleton className="skr-av rounded-full" />
      <div className="skel-row-body">
        <Skeleton className="skr-l1" />
        <Skeleton className="skr-l2" />
      </div>
      <Skeleton className="skr-tag" />
    </div>
  );
}

export function SkelChart() {
  const heights = ["64%", "82%", "47%", "73%", "58%", "90%", "40%"];
  return (
    <div className="skel-chart">
      <Skeleton className="skch-title" />
      <div className="skel-bars">
        {heights.map((h) => (
          <Skeleton key={h} className="skch-bar" style={{ height: h }} />
        ))}
      </div>
    </div>
  );
}

export function SkelGrid({ n = 6 }: Readonly<{ n?: number }>) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
      {Array.from({ length: n }, (_, i) => `skel-${i}`).map((id) => (
        <SkelCard key={id} />
      ))}
    </div>
  );
}
