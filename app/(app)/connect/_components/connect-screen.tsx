"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { SetupSteps } from "@/components/app-shell/setup-steps";
import { Topbar } from "@/components/app-shell/topbar";
import { EmptyState } from "@/components/states/empty-state";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { extractAnyExport } from "@/lib/extract/detect";
import type { ExportPlatform } from "@/lib/extract/extract";
import { ALL_SOURCES, OAUTH_SOURCES, UPLOAD_SOURCES, type Source } from "@/lib/fixtures/sources";

import { importSummaryAction, ingestionStatusAction } from "../actions";
import { ConnectError } from "./connect-error";
import { ImportRun } from "./import-run";
import { SourceCard } from "./source-card";

import "../connect.css";

type RetentionChoice = "retain" | "discard";

/** An imported entry in the summary. `demo` marks fixture sims — they stored nothing. */
interface ImportedSource extends Source {
  demo: boolean;
}

interface Job extends Source {
  progress: number;
  count: number;
  total: number;
}

/** The live upload pipeline: extract in-browser → upload → poll the ingestion run. */
type Upload =
  | { kind: "extracting" }
  | { kind: "uploading"; platform: ExportPlatform }
  | { kind: "ingesting"; platform: ExportPlatform; runId: string; polls: number }
  | { kind: "error"; title: string; message: string }
  | { kind: "nothingKept"; dropped: number };

const IMPORT_DURATION_MS = 2200;
const IMPORT_TICK_MS = 70;
const PROGRESS_STEP = 100 / (IMPORT_DURATION_MS / IMPORT_TICK_MS);
const INGEST_POLL_MS = 2500;
const INGEST_POLL_MAX = 240; // ~10 minutes at the default interval

const PLATFORM_NAMES: Record<ExportPlatform, string> = {
  reddit: "Reddit export",
  x: "X archive",
};

/** The fixture source a demo acknowledgement simulates for each platform. */
function demoSourceFor(platform: ExportPlatform): Source {
  const id = platform === "x" ? "x" : "reddit-export";
  return (
    UPLOAD_SOURCES.find((s) => s.id === id) ??
    OAUTH_SOURCES.find((s) => s.id === platform) ??
    UPLOAD_SOURCES[0]
  );
}

interface ConnectScreenProps {
  /** False = no backend (demo): uploads simulate honestly; extraction still runs. */
  live?: boolean;
  /** Ingestion poll interval / cap; overridden only by tests. */
  ingestPollMs?: number;
  ingestMaxPolls?: number;
}

export function ConnectScreen({
  live = false,
  ingestPollMs = INGEST_POLL_MS,
  ingestMaxPolls = INGEST_POLL_MAX,
}: ConnectScreenProps) {
  const router = useRouter();
  const [sources, setSources] = useState<ImportedSource[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [retention, setRetention] = useState<RetentionChoice>("retain");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Cancellation: bumping the generation invalidates every in-flight continuation,
  // and the controller aborts the network request itself — after an explicit cancel,
  // nothing more leaves the device and no state resurrects.
  const uploadSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      abortRef.current?.abort();
    },
    [],
  );

  // Poll the live ingestion run (D2: imports are runs) until it settles.
  useEffect(() => {
    if (upload?.kind !== "ingesting") return;
    const { runId, platform, polls } = upload;
    const seq = uploadSeq.current;
    const timer = setTimeout(async () => {
      if (polls > ingestMaxPolls) {
        setUpload({
          kind: "error",
          title: "The import is taking too long",
          message: "The ingestion run didn't finish — check back on the dashboard, or try again.",
        });
        return;
      }
      const result = await ingestionStatusAction({ runId });
      if (seq !== uploadSeq.current) return; // cancelled while the poll was in flight
      if (!result.ok) {
        if (result.terminal) {
          setUpload({
            kind: "error",
            title: "We lost track of the import",
            message:
              "The ingestion run can't be read any more. Check the dashboard, or try the upload again.",
          });
          return;
        }
        setUpload({ kind: "ingesting", platform, runId, polls: polls + 1 }); // transient
        return;
      }
      if (result.status === "succeeded") {
        const summary = await importSummaryAction({ runId });
        if (seq !== uploadSeq.current) return;
        if (!summary.ok) {
          // The counts may lag the run row by a beat — keep polling to the cap.
          setUpload({ kind: "ingesting", platform, runId, polls: polls + 1 });
          return;
        }
        if (summary.kept === 0) {
          setUpload({ kind: "nothingKept", dropped: summary.dropped });
          return;
        }
        setSources((s) => [
          ...s,
          {
            id: `live-${runId}`,
            name: PLATFORM_NAMES[platform],
            icon: platform === "x" ? "upload" : "message-square",
            kind: "upload",
            kept: summary.kept,
            dropped: summary.dropped,
            desc: "",
            demo: false,
          },
        ]);
        setUpload(null);
        toast(`${PLATFORM_NAMES[platform]} imported`);
      } else if (result.status === "failed") {
        setUpload({
          kind: "error",
          title: "The import failed",
          message: "The ingestion run failed on our side — nothing was kept. Try the upload again.",
        });
      } else {
        setUpload({ kind: "ingesting", platform, runId, polls: polls + 1 });
      }
    }, ingestPollMs);
    return () => clearTimeout(timer);
  }, [upload, ingestPollMs, ingestMaxPolls]);

  const importedIds = new Set(sources.map((s) => s.id));
  const busy =
    job !== null || (upload !== null && upload.kind !== "error" && upload.kind !== "nothingKept");

  /** The M5.5 fixture simulation — kept for sources that have no backend yet (OAuth
   *  is M6; Takeout/photos are M4). Every completion says it stored nothing. */
  function startSim(src: Source) {
    if (job || importedIds.has(src.id)) return;
    setUpload(null); // a stale error/nothing-kept panel never coexists with a run
    const total = src.kept + src.dropped;
    progressRef.current = 0;
    setJob({ ...src, progress: 0, count: 0, total });
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const p = Math.min(100, progressRef.current + PROGRESS_STEP);
      progressRef.current = p;
      if (p >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setSources((s) => [...s, { ...src, demo: true }]);
        setJob(null);
        toast(`${src.name} imported (demo — nothing stored)`);
      } else {
        setJob((j) => (j ? { ...j, progress: p, count: Math.floor((p / 100) * total) } : j));
      }
    }, IMPORT_TICK_MS);
  }

  function cancelImport() {
    uploadSeq.current += 1; // invalidate in-flight continuations
    abortRef.current?.abort();
    if (intervalRef.current) clearInterval(intervalRef.current);
    setJob(null);
    setUpload(null);
  }

  /** The real path (D3): extract the allow-listed members in-browser, upload only those. */
  async function handleFile(file: File) {
    if (busy) return;
    const seq = ++uploadSeq.current;
    setUpload({ kind: "extracting" });
    const outcome = await extractAnyExport(file);
    if (seq !== uploadSeq.current) return; // cancelled during extraction
    if (!outcome.ok) {
      setUpload({ kind: "error", title: "Couldn't use that export", message: outcome.message });
      return;
    }
    // Demo mode (no backend): the extraction above was real — the file is genuinely
    // valid — but there is nothing to upload to; simulate, honestly labeled. A fresh
    // id per upload keeps re-uploads from being silently swallowed.
    if (!live) {
      setUpload(null);
      startSim({ ...demoSourceFor(outcome.platform), id: `demo-${crypto.randomUUID()}` });
      return;
    }
    setUpload({ kind: "uploading", platform: outcome.platform });

    const form = new FormData();
    form.append("platform", outcome.platform);
    for (const member of outcome.files) form.append("files", member.data, member.name);

    const controller = new AbortController();
    abortRef.current = controller;
    let response: Response;
    try {
      response = await fetch("/api/imports", {
        method: "POST",
        body: form,
        headers: { "Idempotency-Key": crypto.randomUUID() },
        signal: controller.signal,
      });
    } catch {
      if (seq !== uploadSeq.current) return; // aborted by cancel
      setUpload({
        kind: "error",
        title: "Upload failed",
        message:
          "The upload didn't reach us — nothing was imported. Check your connection and try again.",
      });
      return;
    }
    if (seq !== uploadSeq.current) return; // cancelled while uploading

    if (response.status === 501) {
      // Stub era only (route not implemented, pre-W2): simulate, honestly labeled.
      // DELETED at the W2 live flip — a configured backend is then strict (plan §6).
      setUpload(null);
      startSim({ ...demoSourceFor(outcome.platform), id: `demo-${crypto.randomUUID()}` });
      return;
    }
    if (response.status === 202) {
      const body = (await response.json().catch(() => null)) as { run_id?: string } | null;
      if (seq !== uploadSeq.current) return;
      if (body?.run_id) {
        setUpload({ kind: "ingesting", platform: outcome.platform, runId: body.run_id, polls: 0 });
      } else {
        // Accepted but untrackable — never claim nothing was imported.
        setUpload({
          kind: "error",
          title: "Upload accepted, but we lost track of it",
          message:
            "The import was accepted and will be processed — we just couldn't follow its progress here. Check back on the dashboard.",
        });
      }
      return;
    }
    setUpload({
      kind: "error",
      title: response.status === 401 ? "Your session expired" : "Upload refused",
      message:
        response.status === 401
          ? "Sign in again, then retry the upload — the file itself is fine."
          : response.status === 413
            ? "The upload is over the size limit — nothing was imported."
            : "The upload was refused — nothing was imported. Try again, or re-download the export.",
    });
  }

  function openFilePicker() {
    if (!busy) fileInputRef.current?.click();
  }

  const keptTotal = sources.reduce((a, s) => a + s.kept, 0);
  const droppedTotal = sources.reduce((a, s) => a + s.dropped, 0);
  const total = keptTotal + droppedTotal;
  const keptPct = total ? (keptTotal / total) * 100 : 0;
  const hasDemoSources = sources.some((s) => s.demo);

  const showImported = sources.length > 0 && !job && upload === null;
  const showEmpty = sources.length === 0 && !job && upload === null;

  const liveStageProgress =
    upload?.kind === "ingesting" ? Math.min(85, 20 + upload.polls * 12) : 10;

  return (
    <div>
      <Topbar showLens={false} center={<SetupSteps active="connect" />} />
      <main id="main-content" tabIndex={-1} className="connect-wrap">
        <div className="connect-head">
          <h1 className="connect-title">Bring in your footprint</h1>
          <p className="connect-sub">
            Connect a read-only account or upload an export. We import only the data you created —
            and you’ll see exactly what we kept and dropped.
          </p>
          <div className="connect-trust">
            <span className="trust-item">
              <Icon name="shield-check" size={15} /> Read-only access
            </span>
            <span className="trust-item">
              <Icon name="lock" size={15} /> Encrypted at rest
            </span>
            <span className="trust-item">
              <Icon name="user" size={15} /> Your data only
            </span>
            <span className="trust-item">
              <Icon name="trash-2" size={15} /> Erase anytime
            </span>
          </div>
        </div>

        <p className="connect-section-label">Connect a read-only account</p>
        <div className="src-grid">
          {OAUTH_SOURCES.map((src) => (
            <SourceCard
              key={src.id}
              src={src}
              imported={importedIds.has(src.id)}
              busy={busy}
              onConnect={startSim}
            />
          ))}
        </div>
        <div className="x-note">
          <Icon name="info" size={16} />
          <span>
            <b>X (Twitter)</b> doesn’t offer read-only import. Download your X archive and upload it
            below instead.
          </span>
        </div>

        <p className="connect-section-label">Or upload an export</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void handleFile(file);
          }}
        />
        <div
          className="dropzone"
          role="button"
          tabIndex={0}
          aria-disabled={busy}
          data-disabled={busy || undefined}
          onClick={openFilePicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openFilePicker();
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files?.[0];
            if (file && !busy) void handleFile(file);
          }}
          aria-label="Upload an export file"
        >
          <div className="dropzone-ic">
            <Icon name="upload" size={20} />
          </div>
          <div className="dropzone-t">
            Drop your Reddit export or X archive here, or click to browse
          </div>
          <div className="dropzone-d">
            A multi-gigabyte archive never leaves your device whole — we extract only the few files
            the audit needs, in your browser, then encrypt them on our side.
          </div>
        </div>
        <div className="upload-formats">
          {UPLOAD_SOURCES.map((src) => {
            const real = src.id === "x" || src.id === "reddit-export";
            return (
              <button
                key={src.id}
                type="button"
                className="fmt-chip"
                disabled={busy || (!real && importedIds.has(src.id))}
                onClick={() => (real ? openFilePicker() : startSim(src))}
              >
                <Icon name={importedIds.has(src.id) ? "check" : src.icon} size={15} /> {src.name}
              </button>
            );
          })}
        </div>

        {job && (
          <div className="mt-6">
            <ImportRun
              job={{ name: job.name, progress: job.progress, count: job.count, total: job.total }}
              onCancel={cancelImport}
            />
          </div>
        )}
        {upload && upload.kind !== "error" && upload.kind !== "nothingKept" && (
          <div className="mt-6">
            <ImportRun
              job={{
                name:
                  upload.kind === "extracting" ? "your export" : PLATFORM_NAMES[upload.platform],
                progress: upload.kind === "ingesting" ? liveStageProgress : 5,
              }}
              liveRun={upload.kind === "ingesting"}
              onCancel={upload.kind === "ingesting" ? undefined : cancelImport}
            />
          </div>
        )}
        {upload?.kind === "error" && (
          <div className="mt-6">
            {/* ErrorState's title is an h3; keep the heading order h1 → h2 → h3. */}
            <h2 className="sr-only">Import problem</h2>
            <ConnectError
              title={upload.title}
              message={upload.message}
              onRetry={() => setUpload(null)}
            />
          </div>
        )}
        {upload?.kind === "nothingKept" && (
          <div className="mt-6">
            {/* EmptyState's title is an h3; keep the heading order h1 → h2 → h3. */}
            <h2 className="sr-only">Import result</h2>
            <EmptyState
              icon="circle-minus"
              title="Nothing of yours to keep"
              message={
                upload.dropped > 0
                  ? `The export was read — ${upload.dropped} third-party item${upload.dropped === 1 ? "" : "s"} (replies, reposts, other people's posts) were dropped at import, and nothing in it was your own content. Nothing was stored.`
                  : "The export was read, but it contained no items at all. Nothing was stored."
              }
              message2="If that seems wrong, re-download a full export and try again."
            />
            <div className="run-row">
              <Button variant="secondary" onClick={() => setUpload(null)}>
                Try another export
              </Button>
            </div>
          </div>
        )}

        {showImported && (
          <div className="imported">
            <div className="src-chips">
              {sources.map((s) => (
                <span className="src-chip" key={s.id}>
                  <Icon name="check" size={14} stroke={2.5} /> <b>{s.name}</b>
                  <span className="chip-meta">
                    · {s.kept} kept{s.demo ? " · demo" : ""}
                  </span>
                </span>
              ))}
              <button
                type="button"
                className="fmt-chip"
                disabled={!!job || sources.length === ALL_SOURCES.length}
                onClick={openFilePicker}
              >
                <Icon name="plus" size={15} /> Add another
              </button>
            </div>

            <div className="kvd">
              <div className="kvd-title">What we imported</div>
              {hasDemoSources && (
                <p className="kvd-demo-note" role="status">
                  <Icon name="circle-minus" size={13} /> Counts include demo entries — demo imports
                  stored nothing.
                </p>
              )}
              <div className="kvd-stats">
                <div className="kvd-stat kvd-kept">
                  <span className="kvd-stat-ic">
                    <Icon name="check" size={16} stroke={2.5} />
                  </span>
                  <div>
                    <span className="kvd-num">{keptTotal}</span>{" "}
                    <span className="kvd-stat-label">
                      <b>your own items</b> kept
                    </span>
                  </div>
                </div>
                <div className="kvd-stat kvd-dropped">
                  <span className="kvd-stat-ic">
                    <Icon name="x" size={16} />
                  </span>
                  <div>
                    <span className="kvd-num">{droppedTotal}</span>{" "}
                    <span className="kvd-stat-label">
                      <b>third-party items</b> dropped
                    </span>
                  </div>
                </div>
              </div>
              <div className="kvd-bar">
                <div className="kvd-bar-kept" style={{ width: `${keptPct}%` }} />
                <div className="kvd-bar-dropped" style={{ width: `${100 - keptPct}%` }} />
              </div>
              <div className="kvd-legend">
                <span>
                  <span className="kvd-dot kvd-dot--kept" /> Kept (yours)
                </span>
                <span>
                  <span className="kvd-dot kvd-dot--dropped" /> Dropped (others’)
                </span>
              </div>
              <p className="kvd-note">
                We only keep data <b>you</b> created. Others’ replies, quotes, reposts, and people
                in your photos were dropped at import — they’re not yours to audit.
              </p>
            </div>

            <hr className="imported-sep" />

            <div className="ret-label">How should we hold your data?</div>
            <p className="ret-hint">You can change this or erase everything anytime in Account.</p>
            <div className="retention" role="radiogroup" aria-label="Data retention">
              <label className="ret-card">
                <input
                  type="radio"
                  name="retention"
                  value="retain"
                  checked={retention === "retain"}
                  onChange={() => setRetention("retain")}
                />
                <div className="ret-head">
                  <Icon name="lock" size={17} />
                  <span className="ret-name">Retain, encrypted</span>
                  <span className="ret-check">
                    <Icon name="check" size={11} stroke={3} />
                  </span>
                </div>
                <p className="ret-desc">
                  Keep your imported data encrypted so you can re-run the audit and prove your
                  before → after over time. Crypto-shred it anytime.
                </p>
              </label>
              <label className="ret-card">
                <input
                  type="radio"
                  name="retention"
                  value="discard"
                  checked={retention === "discard"}
                  onChange={() => setRetention("discard")}
                />
                <div className="ret-head">
                  <Icon name="trash-2" size={17} />
                  <span className="ret-name">Process, then discard</span>
                  <span className="ret-check">
                    <Icon name="check" size={11} stroke={3} />
                  </span>
                </div>
                <p className="ret-desc">
                  Analyze now and delete the raw data immediately after. We keep only the findings —
                  not your content. Re-running later means importing again.
                </p>
              </label>
            </div>

            <div className="run-row">
              {/* The audit run itself is wired in F5; this navigates the demo reveal. */}
              <Button onClick={() => router.push("/dashboard?state=loading")}>
                Run my audit <Icon name="arrow-right" size={15} />
              </Button>
              <span className="run-note">
                This starts the attack run on your own footprint. You’ll land on the reveal — what
                an AI can infer about you.
              </span>
            </div>
          </div>
        )}

        {showEmpty && (
          <div className="imported-empty">
            Nothing imported yet — connect or upload above to begin. We’ll show you exactly what we
            keep.
          </div>
        )}
      </main>
    </div>
  );
}
