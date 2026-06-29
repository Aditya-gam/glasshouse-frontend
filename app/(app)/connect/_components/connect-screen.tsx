"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { SetupSteps } from "@/components/app-shell/setup-steps";
import { Topbar } from "@/components/app-shell/topbar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { ALL_SOURCES, OAUTH_SOURCES, UPLOAD_SOURCES, type Source } from "@/lib/fixtures/sources";

import { ConnectError } from "./connect-error";
import { ImportRun } from "./import-run";
import { SourceCard } from "./source-card";

import "../connect.css";

type RetentionChoice = "retain" | "discard";
interface Job extends Source {
  progress: number;
  count: number;
  total: number;
}

const IMPORT_DURATION_MS = 2200;
const IMPORT_TICK_MS = 70;
const PROGRESS_STEP = 100 / (IMPORT_DURATION_MS / IMPORT_TICK_MS);

export function ConnectScreen() {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>([]);
  const [job, setJob] = useState<Job | null>(null);
  const [retention, setRetention] = useState<RetentionChoice>("retain");
  const [error, setError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef(0);

  useEffect(
    () => () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    [],
  );

  const importedIds = new Set(sources.map((s) => s.id));
  const busy = job !== null || error;

  function startImport(src: Source) {
    if (job || importedIds.has(src.id)) return;
    // M5.5: the X archive deterministically fails to parse (the realistic "wrong or
    // partial export" case). M5.4 wires real parsing + real failures.
    if (src.id === "x") {
      setError(true);
      return;
    }
    const total = src.kept + src.dropped;
    progressRef.current = 0;
    setJob({ ...src, progress: 0, count: 0, total });
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const p = Math.min(100, progressRef.current + PROGRESS_STEP);
      progressRef.current = p;
      if (p >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setSources((s) => [...s, src]);
        setJob(null);
        toast(`${src.name} imported`);
      } else {
        setJob((j) => (j ? { ...j, progress: p, count: Math.floor((p / 100) * total) } : j));
      }
    }, IMPORT_TICK_MS);
  }

  function cancelImport() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setJob(null);
  }

  const keptTotal = sources.reduce((a, s) => a + s.kept, 0);
  const droppedTotal = sources.reduce((a, s) => a + s.dropped, 0);
  const total = keptTotal + droppedTotal;
  const keptPct = total ? (keptTotal / total) * 100 : 0;

  const showImported = sources.length > 0 && !job && !error;
  const showEmpty = sources.length === 0 && !job && !error;
  // Dropzone imports a source that succeeds; the X archive chip shows the error path.
  const dropzoneSource = UPLOAD_SOURCES.find((s) => s.id !== "x") ?? UPLOAD_SOURCES[0];

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
              onConnect={startImport}
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
        <div
          className="dropzone"
          role="button"
          tabIndex={0}
          onClick={() => startImport(dropzoneSource)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              startImport(dropzoneSource);
            }
          }}
          aria-label="Upload an export file"
        >
          <div className="dropzone-ic">
            <Icon name="upload" size={20} />
          </div>
          <div className="dropzone-t">Drop an export here, or click to browse</div>
          <div className="dropzone-d">
            Nothing leaves your control — files are parsed, then encrypted on our side.
          </div>
        </div>
        <div className="upload-formats">
          {UPLOAD_SOURCES.map((src) => (
            <button
              key={src.id}
              type="button"
              className="fmt-chip"
              disabled={busy || importedIds.has(src.id)}
              onClick={() => startImport(src)}
            >
              <Icon name={importedIds.has(src.id) ? "check" : src.icon} size={15} /> {src.name}
            </button>
          ))}
        </div>

        {job && (
          <div className="mt-6">
            <ImportRun job={job} onCancel={cancelImport} />
          </div>
        )}
        {error && (
          <div className="mt-6">
            <ConnectError onRetry={() => setError(false)} />
          </div>
        )}

        {showImported && (
          <div className="imported">
            <div className="src-chips">
              {sources.map((s) => (
                <span className="src-chip" key={s.id}>
                  <Icon name="check" size={14} stroke={2.5} /> <b>{s.name}</b>
                  <span className="chip-meta">· {s.kept} kept</span>
                </span>
              ))}
              <button
                type="button"
                className="fmt-chip"
                disabled={!!job || sources.length === ALL_SOURCES.length}
                onClick={() => {
                  const next = ALL_SOURCES.find((s) => !importedIds.has(s.id) && s.id !== "x");
                  if (next) startImport(next);
                }}
              >
                <Icon name="plus" size={15} /> Add another
              </button>
            </div>

            <div className="kvd">
              <div className="kvd-title">What we imported</div>
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
