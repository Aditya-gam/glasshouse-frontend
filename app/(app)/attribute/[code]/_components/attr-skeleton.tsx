import { Skeleton } from "@/components/ui/skeleton";

/** Two-pane loading skeleton mirroring the evidence + summary layout. */
export function AttrSkeleton() {
  return (
    <div className="attr-layout">
      <section className="evidence" aria-hidden="true">
        <div className="ev-intro">
          <Skeleton className="sks-title" />
          <Skeleton className="sks-title--gap" />
          <Skeleton className="sks-line2" />
        </div>
        <div className="ev-list ev-list--skel">
          {[0, 1, 2, 3].map((i) => (
            <div className="ev-skel" key={i}>
              <div className="ev-skel-head">
                <Skeleton className="sks-src" />
                <Skeleton className="sks-badge" />
              </div>
              <Skeleton className="sks-line1" />
              <Skeleton className="sks-line2" />
              <Skeleton className="sks-foot" />
            </div>
          ))}
        </div>
      </section>
      <aside className="summary" aria-hidden="true">
        <div className="sum-skel">
          <Skeleton className="sks-attr" />
          <Skeleton className="sks-value" />
          <Skeleton className="sks-chip" />
          <Skeleton className="sks-bar" />
          <Skeleton className="sks-block" />
          <Skeleton className="sks-btn" />
        </div>
      </aside>
    </div>
  );
}
