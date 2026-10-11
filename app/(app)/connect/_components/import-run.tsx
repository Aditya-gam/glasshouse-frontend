import { RunProgress } from "@/components/states/run-progress";

/** Live ingestion stages, fed to the shared RunProgress primitive. */
const STAGE_LABELS = ["Parsing items", "Dropping third-party", "Encrypting + embedding"];

export function stageIndex(progress: number): number {
  if (progress < 42) return 0;
  if (progress < 76) return 1;
  return 2;
}

export interface ImportJob {
  name: string;
  progress: number;
  /** Item counts are known only for the fixture simulation; live runs omit them. */
  count?: number;
  total?: number;
}

/** Live runs report only queued/running/succeeded — the UI never fabricates per-item
 *  pipeline stages it can't observe. */
const LIVE_STAGE_LABELS = [
  "Uploading",
  "Processing on our side — parse, drop third-party, encrypt",
];

export function ImportRun({
  job,
  liveRun = false,
  onCancel,
}: {
  job: ImportJob;
  liveRun?: boolean;
  onCancel?: () => void;
}) {
  return (
    <RunProgress
      title={
        job.count != null && job.total != null
          ? `Importing ${job.name} — ${job.count} of ${job.total} items`
          : `Importing ${job.name}`
      }
      stages={liveRun ? LIVE_STAGE_LABELS : STAGE_LABELS}
      current={liveRun ? (job.progress > 15 ? 1 : 0) : stageIndex(job.progress)}
      status="running"
      hint="We parse your items, drop anything that isn't yours, then encrypt what's left. You don't need to wait here."
      onCancel={onCancel}
    />
  );
}
