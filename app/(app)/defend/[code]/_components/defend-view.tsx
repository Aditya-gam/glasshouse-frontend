"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Breadcrumb } from "@/components/app-shell/breadcrumb";
import { Topbar } from "@/components/app-shell/topbar";
import { useLens } from "@/components/app-shell/use-lens";
import { ErrorState } from "@/components/states/error-state";
import { RunProgress } from "@/components/states/run-progress";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import type { DefendOption, DefendOptionKey, DefendTarget } from "@/lib/fixtures/defend";
import type { Lens } from "@/lib/schemas/attribute";

import { CantBreakResult } from "./cant-break";
import { DecoyDialogs, type DecoyDialog } from "./decoy-dialogs";
import { DiffItem } from "./diff-item";
import { FrontierOption } from "./frontier-option";
import { Hero } from "./hero";
import { NotProvenResult } from "./not-proven";
import { useDefendRun } from "./use-defend-run";

import "../defend.css";

export type DefendViewState = "loaded" | "loading" | "unproven" | "nomeaning" | "error";

const DEFEND_STAGES = ["Find the minimal set", "Draft edits", "Re-attack & prove"];

interface DefendViewProps {
  initialState: DefendViewState;
  target: DefendTarget;
  options: DefendOption[];
  decoyBackfire: Record<Lens, string>;
}

export function DefendView({ initialState, target, options, decoyBackfire }: DefendViewProps) {
  const { lens } = useLens();
  const [view, setView] = useState<DefendViewState>(initialState);
  const [selectedKey, setSelectedKey] = useState<DefendOptionKey>("minimal");
  const [decoyEnabled, setDecoyEnabled] = useState(false);
  const [dialog, setDialog] = useState<DecoyDialog>(null);
  const run = useDefendRun(view === "loading", () => setView("loaded"));

  const opt = options.find((o) => o.key === selectedKey) ?? options[0];

  const selectOption = (o: DefendOption) => {
    if (o.key !== "decoy") {
      setSelectedKey(o.key);
      return;
    }
    // Decoy is never selected directly — global opt-in, then per-use confirm.
    setDialog(decoyEnabled ? "confirm" : "optin");
  };
  const enableDecoy = () => {
    setDecoyEnabled(true);
    setDialog("confirm");
  };
  const confirmDecoy = () => {
    setSelectedKey("decoy");
    setDialog(null);
  };
  const disableDecoy = () => {
    setDecoyEnabled(false);
    if (selectedKey === "decoy") setSelectedKey("minimal");
  };

  const crumbs = (
    <Breadcrumb
      items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Current location", href: "/attribute/location" },
        { label: "Break this" },
      ]}
    />
  );
  const diffMeta = opt.remove ? "removals" : opt.key === "decoy" ? "decoy suggestion" : "edits";

  return (
    <div>
      <Topbar center={crumbs} />
      <main className="defend-wrap">
        <div className="defend-head">
          <h1 className="defend-title">Break this inference</h1>
          <p className="defend-sub">
            Targeting your <b>{target.attribute.toLowerCase()}</b> — Lisbon, Portugal.{" "}
            {view === "loading"
              ? "Running the rewrite-and-prove loop now."
              : view === "unproven" || view === "nomeaning"
                ? "Here's the honest outcome."
                : view === "error"
                  ? "Something interrupted the run."
                  : "Pick how far to go on the privacy ⁄ utility frontier; the proven result updates below."}
          </p>
        </div>

        {view === "loading" && (
          <div className="run-progress-wrap">
            <RunProgress
              title="Proving your rewrite"
              stages={DEFEND_STAGES}
              current={run.stage}
              status={run.status}
              hint="Longer than a scan — we draft edits, then re-attack to check they actually hold up."
              onCancel={() => setView("loaded")}
            />
            <div className="prove-line">
              <Icon name="shield-check" size={15} />{" "}
              <span>
                <b>Proving against an independent adversary</b> — a different model re-attacks your
                edited content, blind to the change.
              </span>
            </div>
          </div>
        )}

        {view === "error" && (
          <ErrorState
            title="The simulation didn't finish"
            message="The rewrite-and-prove run stopped before it completed — almost always a temporary issue, not a problem with your data."
            onRetry={() => setView("loading")}
            retryLabel="Re-run simulation"
            details={
              "request_id: def_9a17c4\nstage: re-attack\nreason: adversary worker timeout (504)"
            }
          />
        )}

        {view === "unproven" && (
          <NotProvenResult
            onStronger={() => {
              setSelectedKey("stronger");
              setView("loaded");
            }}
            onRemove={() => {
              setSelectedKey("remove");
              setView("loaded");
            }}
          />
        )}

        {view === "nomeaning" && (
          <CantBreakResult
            onRemove={() => {
              setSelectedKey("remove");
              setView("loaded");
              toast("Switched to remove — the only clean break");
            }}
            onAccept={() => toast("Keeping the post — residual exposure acknowledged")}
          />
        )}

        {view === "loaded" && (
          <>
            <Hero opt={opt} target={target} />

            <p className="section-label">Privacy ⁄ utility frontier</p>
            <p className="section-hint">
              More privacy costs more of your voice. Truthful options first; the decoy is off by
              default.
            </p>
            <div className="frontier" role="radiogroup" aria-label="Remediation options">
              {options.map((o) => (
                <FrontierOption
                  key={o.key}
                  opt={o}
                  selected={selectedKey === o.key}
                  decoyEnabled={decoyEnabled}
                  onSelect={selectOption}
                />
              ))}
            </div>
            {decoyEnabled && (
              <div className="decoy-status decoy-status-on" style={{ marginTop: "var(--space-3)" }}>
                <Icon name="triangle-alert" size={14} /> Decoy mode is on.{" "}
                <button
                  type="button"
                  className="verify-undo"
                  style={{ marginTop: 0 }}
                  onClick={disableDecoy}
                >
                  Turn off
                </button>
              </div>
            )}

            <p className="section-label">Suggested {diffMeta}</p>
            <div className="diff">
              <div className="diff-head">
                <span className="diff-head-t">{opt.name}</span>
                <span className="diff-head-meta">
                  {opt.edits.length} {opt.edits.length === 1 ? "item" : "items"} · the minimal set
                  ablation flagged
                </span>
              </div>
              {opt.edits.map((edit, i) => (
                <DiffItem key={`${edit.src}-${i}`} edit={edit} />
              ))}
            </div>

            <div className="nofalse" role="note">
              <Icon name="shield-alert" className="nofalse-ic" size={20} />
              <div className="nofalse-body">
                <b className="nofalse-lead">No false safety.</b> This is evidence, not proof. One
                independent adversary could no longer recover your city — a stronger or future model
                still might, and copies others already saved (screenshots, archives, reposts)
                can&rsquo;t be recalled. Reducing exposure is not erasing it.
                {lens === "atrisk" && (
                  <>
                    {" "}
                    <b>
                      Because safety matters most for you, treat this as lowered risk, never a
                      guarantee.
                    </b>
                  </>
                )}
              </div>
            </div>

            <div className="defend-actions">
              {opt.remove ? (
                <Button onClick={() => toast("Copied the removal list")}>
                  <Icon name="copy" size={15} /> Copy removal list
                </Button>
              ) : opt.key === "decoy" ? (
                <Button className="btn-warn" onClick={() => toast("Copied the decoy text")}>
                  <Icon name="copy" size={15} /> Copy the decoy text
                </Button>
              ) : (
                <>
                  <Button onClick={() => toast("Copied the rewrite to your clipboard")}>
                    <Icon name="copy" size={15} /> Copy the rewrite
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => toast("Downloading photo with GPS removed")}
                  >
                    <Icon name="download" size={15} /> Download photo (GPS stripped)
                  </Button>
                </>
              )}
              <span className="advise-note">
                <b>Advise-only.</b> We never post, edit, or delete for you — you copy this and make
                the change yourself.
              </span>
            </div>
          </>
        )}
      </main>

      <DecoyDialogs
        dialog={dialog}
        backfire={decoyBackfire[lens]}
        onClose={() => setDialog(null)}
        onEnable={enableDecoy}
        onConfirm={confirmDecoy}
      />
    </div>
  );
}
