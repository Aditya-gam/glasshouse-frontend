import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { BENCH } from "@/lib/fixtures/trust";

const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f", "g", "h"];

function BenchSkeleton() {
  return (
    <div className="bench" aria-hidden="true">
      <div className="bench-legend">
        <Skeleton className="skb-legend" />
        <Skeleton className="skb-legend" />
      </div>
      {SKELETON_ROWS.map((id) => (
        <div className="bench-row" key={id}>
          <Skeleton className="skb-label" />
          <Skeleton className="skb-track" />
          <Skeleton className="skb-vals" />
        </div>
      ))}
    </div>
  );
}

export function BenchmarkSection({ loading }: Readonly<{ loading: boolean }>) {
  return (
    <section className="trust-sec">
      <p className="sec-eyebrow">
        <Icon name="bar-chart-3" size={14} /> The benchmark
      </p>
      <h2 className="trust-h2">Measured accuracy, per attribute</h2>
      <p className="trust-p">
        We run the <b>exact same engine</b> used on your footprint over <b>SynthPAI</b> — synthetic,
        Reddit-style profiles with human-verified labels (no real people). For each attribute we
        report <b>top-1</b> (the single best guess) and <b>top-3</b> (correct within three).
      </p>
      {loading ? (
        <BenchSkeleton />
      ) : (
        <div className="bench">
          <div className="bench-legend">
            <span>
              <span className="bench-key bench-key--top1" /> Top-1 accuracy
            </span>
            <span>
              <span className="bench-key bench-key--top3" /> Top-3 accuracy
            </span>
          </div>
          {BENCH.map((b) => (
            <div className="bench-row" key={b.label}>
              <div className="bench-label">{b.label}</div>
              <div className="bench-track">
                <div className="bench-top3" style={{ width: `${b.top3}%` }} />
                <div className="bench-top1" style={{ width: `${b.top1}%` }} />
              </div>
              <div className="bench-vals">
                <b>{b.top1}</b> / {b.top3}%
              </div>
            </div>
          ))}
          <p className="bench-foot">
            Categorical attributes (sex, relationship) score exact-match; location and birthplace
            use graded geographic matching; age and income use tolerance bands. Harder attributes
            like income are honestly lower — we don&rsquo;t average them away.
          </p>
        </div>
      )}
    </section>
  );
}
