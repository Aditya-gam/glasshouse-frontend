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
  count: number;
  total: number;
}

export function ImportRun({ job, onCancel }: { job: ImportJob; onCancel: () => void }) {
  return (
    <RunProgress
      title={`Importing ${job.name} — ${job.count} of ${job.total} items`}
      stages={STAGE_LABELS}
      current={stageIndex(job.progress)}
      status="running"
      hint="We parse your items, drop anything that isn't yours, then encrypt what's left. You don't need to wait here."
      onCancel={onCancel}
    />
  );
}
