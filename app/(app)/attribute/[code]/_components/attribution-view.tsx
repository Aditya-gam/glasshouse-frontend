"use client";

import Link from "next/link";
import { useState } from "react";

import { Breadcrumb } from "@/components/app-shell/breadcrumb";
import { Topbar } from "@/components/app-shell/topbar";
import { useLens } from "@/components/app-shell/use-lens";
import { ReliabilityBar } from "@/components/attribute/reliability-bar";
import { SeverityChip } from "@/components/attribute/severity-chip";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";
import { buttonVariants } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { EvidenceItem as EvidenceItemData, LocationFinding } from "@/lib/fixtures/attribution";
import type { Lens } from "@/lib/schemas/attribute";
import { lensSeverity } from "@/lib/severity";
import { cn } from "@/lib/utils";

import { AttrSkeleton } from "./attr-skeleton";
import { EvidenceItem } from "./evidence-item";
import { KindBadge } from "./kind-badge";
import { Verify } from "./verify";

import "../attribution.css";

export type AttributionViewState = "loaded" | "loading" | "empty" | "error";

interface AttributionViewProps {
  code: string;
  initialState: AttributionViewState;
  finding: LocationFinding;
  why: Record<Lens, string>;
  evidence: EvidenceItemData[];
}

function humanize(code: string): string {
  return code.charAt(0).toUpperCase() + code.slice(1);
}

function BackToFootprint() {
  return (
    <div className="state-back">
      <Link href="/dashboard">
        <Icon name="arrow-left" size={15} /> Back to your footprint
      </Link>
    </div>
  );
}

export function AttributionView({
  code,
  initialState,
  finding,
  why,
  evidence,
}: AttributionViewProps) {
  const { lens } = useLens();
  // Only `location` is fully wired; any other attribute shows the abstained empty state.
  const [view, setView] = useState<AttributionViewState>(
    code === "location" ? initialState : "empty",
  );
  const level = lensSeverity(finding.sev, lens);
  const attrLabel = code === "location" ? finding.label : humanize(code);

  const crumbs = (
    <Breadcrumb items={[{ label: "Dashboard", href: "/dashboard" }, { label: attrLabel }]} />
  );

  return (
    <div>
      <Topbar center={crumbs} />

      <main>
        <h1 className="sr-only">{attrLabel} — why this inference</h1>

        {view === "loading" && <AttrSkeleton />}

        {view === "empty" && (
          <div className="attr-layout">
            <div className="attr-state-host">
              <EmptyState
                icon="circle-minus"
                title={`No signal found for ${attrLabel.toLowerCase()}`}
                message="The engine looked across your footprint and found nothing reliable to infer here. This is a deliberate abstention — not a guess, and not an error."
                message2="There's no evidence to show because none was decisive."
              />
              <BackToFootprint />
            </div>
          </div>
        )}

        {view === "error" && (
          <div className="attr-layout">
            <div className="attr-state-host">
              <ErrorState
                title="We couldn't load this evidence"
                message="The attribution didn't load — this is almost always a temporary connection issue, not a problem with your data."
                onRetry={() => setView("loaded")}
                retryLabel="Try again"
                details={
                  "request_id: attr_7f1a23\nattribute: location\nreason: evidence service unavailable (503)"
                }
              />
              <BackToFootprint />
            </div>
          </div>
        )}

        {view === "loaded" && (
          <div className="attr-layout">
            <section className="evidence" aria-label="Evidence">
              <div className="ev-intro">
                <h2>Why this inference?</h2>
                <p className="ev-collective">
                  <b>Six individually-bland posts triangulate your city.</b> No single one names
                  Lisbon — together they pin it. A photo&rsquo;s GPS narrows it to your
                  neighborhood. Even without that photo, the text alone still points here (≈
                  {finding.textOnlyReliability}
                  %).
                </p>
                <div className="ev-legend">
                  <span className="ev-legend-item">
                    <KindBadge kind="proven" />{" "}
                    <span>
                      <b>Proven</b> — removing it measurably drops the inference (ablation).
                    </span>
                  </span>
                  <span className="ev-legend-item">
                    <KindBadge kind="likely" />{" "}
                    <span>
                      <b>Likely</b> — the attack cited it, but it isn&rsquo;t decisive alone.
                    </span>
                  </span>
                </div>
              </div>
              <div className="ev-list">
                {evidence.map((item) => (
                  <EvidenceItem key={item.id} item={item} />
                ))}
              </div>
            </section>

            <aside className="summary">
              <div className="summary-card">
                <div className="sum-attr">{finding.label}</div>
                <div className="sum-value">
                  {finding.value} <span className="sum-detail">· {finding.precision}</span>
                </div>
                <div className="sum-sevrow">
                  <SeverityChip level={level} />
                  <span className="sum-pin">pinned to {finding.neighborhood}</span>
                </div>
                <p className="sum-why">{why[lens]}</p>

                <div className="sum-rel">
                  <div className="sum-rel-top">
                    <span className="sum-rel-label">Calibrated reliability</span>
                    <span className="sum-rel-pct">{finding.reliability}%</span>
                  </div>
                  <ReliabilityBar point={finding.reliability} lo={finding.lo} hi={finding.hi} />
                  <div className="sum-range">
                    calibrated range {finding.lo}–{finding.hi}% · not the model&rsquo;s raw
                    confidence
                  </div>
                </div>

                <div className="sum-reasoning">
                  <span className="sum-reasoning-k">How it was inferred</span>
                  {finding.reasoning}
                </div>
                <div className="sum-cands">
                  <b>Top guess</b> {finding.candidates[0].label} · also weighed{" "}
                  {finding.candidates
                    .slice(1)
                    .map((c) => c.label)
                    .join(" · ")}
                </div>

                <hr className="sum-sep" />
                <Verify />

                <hr className="sum-sep" />
                <div className="sum-cta">
                  <Link href="/defend/location" className={cn(buttonVariants(), "w-full")}>
                    Break this inference <Icon name="arrow-right" size={15} />
                  </Link>
                </div>
                <p className="sum-nofalse">
                  <Icon name="shield-alert" size={14} />
                  No false safety: editing later can&rsquo;t recall copies others already made.
                  Breaking the inference reduces what an adversary can recover — it can&rsquo;t
                  erase the past.
                </p>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
