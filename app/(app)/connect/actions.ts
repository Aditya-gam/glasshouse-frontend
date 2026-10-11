"use server";

import { z } from "zod";

import { listImports } from "@/lib/dal/imports";
import { BackendError } from "@/lib/dal/backend";
import { readRun } from "@/lib/dal/runs";

/**
 * Server Actions for the Connect flow (F2): poll the ingestion run and read the
 * finished import's kept-vs-dropped counts. The upload itself goes through the
 * /api/imports proxy (multipart streams don't belong in an action).
 */

const runInput = z.object({ runId: z.uuid() });

export type RunStatusResult =
  | { ok: true; status: string }
  /** `terminal`: the run can never be read (gone / not the caller's) — stop polling. */
  | { ok: false; terminal?: boolean };

/** Poll the ingestion run (D2: imports are runs and reuse the existing polling). */
export async function ingestionStatusAction(input: unknown): Promise<RunStatusResult> {
  const parsed = runInput.safeParse(input);
  if (!parsed.success) return { ok: false, terminal: true };
  try {
    const run = await readRun(parsed.data.runId);
    return { ok: true, status: run.status };
  } catch (error) {
    const terminal = error instanceof BackendError && [401, 403, 404].includes(error.status);
    return terminal ? { ok: false, terminal: true } : { ok: false };
  }
}

export type ImportSummaryResult = { ok: true; kept: number; dropped: number } | { ok: false };

/** The finished run's kept-vs-dropped counts, from its import row. */
export async function importSummaryAction(input: unknown): Promise<ImportSummaryResult> {
  const parsed = runInput.safeParse(input);
  if (!parsed.success) return { ok: false };
  try {
    const imports = await listImports();
    const row = imports.find((item) => item.runId === parsed.data.runId);
    if (!row || row.keptCount == null || row.droppedCount == null) return { ok: false };
    return { ok: true, kept: row.keptCount, dropped: row.droppedCount };
  } catch {
    return { ok: false };
  }
}
