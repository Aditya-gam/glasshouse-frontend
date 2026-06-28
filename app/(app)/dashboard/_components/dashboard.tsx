"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Topbar } from "@/components/app-shell/topbar";
import { useLens } from "@/components/app-shell/use-lens";
import { AttributeCard } from "@/components/attribute/attribute-card";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { RunProgress } from "@/components/states/run-progress";
import { SkelCard } from "@/components/states/skeletons";
import { Icon } from "@/components/ui/icon";
import { LENSES, LENS_COPY } from "@/lib/persona";
import type { AttrItem } from "@/lib/schemas/attribute";
import { inferredCount, orderFor, severityFor } from "@/lib/severity";

import { PageHead } from "./page-head";
import { useAuditRun } from "./use-audit-run";

import "../dashboard.css";

export type DashboardView = "loaded" | "loading" | "empty" | "abstained" | "error";
const STAGES = ["Retrieve", "Infer", "Calibrate"];

export function Dashboard({
  attrs,
  initialState,
}: {
  attrs: AttrItem[];
  initialState: DashboardView;
}) {
  const { lens } = useLens();
  const [view, setView] = useState<DashboardView>(initialState);
  const [safetyDismissed, setSafetyDismissed] = useState(false);

  const run = useAuditRun(view === "loading", () => setView("loaded"));

  const ordered = orderFor(attrs, lens);
  const count = inferredCount(attrs);
  const hasExtreme = ordered.some((a) => severityFor(a, lens) === "extreme");
  const showSafety = view === "loaded" && hasExtreme && !safetyDismissed;
  const lensLabel = LENSES.find((l) => l.key === lens)?.label ?? "Balanced";

  let pageSub: string;
  if (view === "loading") {
    pageSub =
      "Running the attack on your own footprint — each card appears as it's retrieved, inferred, and calibrated.";
  } else if (view === "abstained") {
    pageSub =
      "We ran the full attack on your footprint and couldn't reliably infer anything. That's a good result — here's the honest breakdown.";
  } else {
    pageSub = `An AI read your public footprint and inferred ${count} of these 8 attributes about you. ${LENS_COPY[lens]}`;
  }

  // Only `location` is wired end-to-end → its card is a link to the detail; the rest
  // surface a "not wired in this prototype" toast on Fix this.
  const fixToast = (attr: AttrItem) => () =>
    toast(`${attr.label}: only the location finding is wired in this prototype`);

  const runStatus = {
    loaded: (
      <span className="run-status">
        <span className="run-dot" /> Audit complete <span className="run-time">· 2m ago</span>
      </span>
    ),
    loading: (
      <span className="run-status">
        <span className="run-dot run-dot--run" /> Auditing your footprint…
      </span>
    ),
    abstained: (
      <span className="run-status">
        <span className="run-dot" /> Audit complete <span className="run-time">· 1m ago</span>
      </span>
    ),
    empty: (
      <span className="run-status">
        <span className="run-dot run-dot--idle" /> No audit yet
      </span>
    ),
    error: (
      <span className="run-status">
        <span className="run-dot run-dot--fail" /> Audit didn&rsquo;t finish
      </span>
    ),
  }[view];

  return (
    <div>
      <Topbar center={runStatus} />
      <main className="content">
        {view === "empty" && (
          <EmptyState
            icon="inbox"
            title="Nothing to analyze yet"
            message="Connect a read-only account or upload an export, and we'll show you what an AI can infer about you."
            message2="Consent-first and advise-only — nothing runs until you say so."
            action="Connect or import"
            actionHref="/connect"
          />
        )}

        {view === "error" && (
          <ErrorState
            title="We couldn't finish your audit"
            message="The run stopped before it completed — this is almost always a temporary connection issue, not a problem with your data."
            onRetry={() => setView("loading")}
            retryLabel="Re-run audit"
            details={
              "request_id: run_3b2c9f\nstage: infer\nreason: upstream timeout (504) after 30s\nyour data was not affected"
            }
          />
        )}

        {(view === "loaded" || view === "loading" || view === "abstained") && (
          <>
            <PageHead showCalib={view === "loaded"} sub={pageSub} />

            {view === "loaded" && (
              <div className="page-meta">
                <b>{count} of 8</b> inferred
                <span className="meta-mid" />
                <b>1</b> abstained
                <span className="meta-mid" />
                severity shown for the <b>{lensLabel}</b> lens
              </div>
            )}
            {view === "abstained" && (
              <div className="page-meta">
                <b>0 of 8</b> inferred
                <span className="meta-mid" />
                <b>8</b> abstained — no signal
              </div>
            )}

            {view === "loading" && (
              <div className="run-progress-wrap">
                <RunProgress
                  title="Running your audit"
                  stages={STAGES}
                  current={run.stage}
                  status={run.status}
                  hint="This can take a moment. Results stream in as each attribute is calibrated — you don't need to wait here."
                  onCancel={() => setView("empty")}
                />
              </div>
            )}

            {showSafety && (
              <div className="safety" role="note">
                <span className="safety-ic">
                  <Icon name="shield" size={18} />
                </span>
                <span className="safety-txt">
                  <b>Concerned about your safety?</b> A precise location was inferred.
                  Digital-safety and crisis resources are available — these are pointers, not
                  advice.{" "}
                  <button
                    type="button"
                    className="safety-link"
                    onClick={() => toast("Opening safety resources")}
                  >
                    View resources
                  </button>
                </span>
                <button
                  type="button"
                  className="safety-x"
                  aria-label="Dismiss"
                  onClick={() => setSafetyDismissed(true)}
                >
                  <Icon name="x" size={16} />
                </button>
              </div>
            )}

            {view === "abstained" && (
              <div className="all-abstain-note" role="note">
                <span className="aan-ic">
                  <Icon name="shield-check" size={18} />
                </span>
                <span className="aan-body">
                  <b>We couldn&rsquo;t infer anything from your current footprint.</b> Every
                  attribute came back &ldquo;abstained — no signal.&rdquo; We won&rsquo;t
                  manufacture a guess to fill the gap. This can change as you post more, so
                  it&rsquo;s worth re-running now and then — but for now, there&rsquo;s little here
                  to work with.
                </span>
              </div>
            )}

            <div className="grid" key={`${view}-${lens}`}>
              {view === "abstained"
                ? attrs.map((attr) => (
                    <AttributeCard
                      key={attr.code}
                      attr={{ ...attr, abstain: true }}
                      level="abstain"
                    />
                  ))
                : ordered.map((attr, i) => {
                    if (view === "loading" && i >= run.revealed)
                      return <SkelCard key={attr.code} />;
                    return (
                      <AttributeCard
                        key={attr.code}
                        attr={attr}
                        level={severityFor(attr, lens)}
                        detailHref={attr.code === "location" ? "/attribute/location" : null}
                        onFix={attr.code === "location" ? undefined : fixToast(attr)}
                      />
                    );
                  })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
