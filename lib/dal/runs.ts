import "server-only";

import { randomUUID } from "node:crypto";

import { createRunV1RunsPost, readRunV1RunsRunIdGet } from "@/lib/api";
import { zRunAccepted, zRunStatus } from "@/lib/api/zod.gen";

import { backendAuth, toBackendError } from "./backend";

/**
 * Runs DAL — the live attack-run path (the one endpoint shipped at BE M1). Inferences,
 * eval, and remediations still 501, so their screens stay on fixtures until they land.
 */

export interface AttackRunHandle {
  runId: string;
  status: string;
}

/**
 * Start an attack run on a single attribute. `POST /v1/runs {type:"attack"}` → 202.
 * The Idempotency-Key dedupes client retries (a double-submit yields one run).
 */
export async function createAttackRun(
  attribute: string,
  idempotencyKey: string = randomUUID(),
): Promise<AttackRunHandle> {
  const { token, devUserId } = await backendAuth();
  const { data, error, response } = await createRunV1RunsPost({
    body: { type: "attack", params: { attribute } },
    auth: token,
    headers: {
      "idempotency-key": idempotencyKey,
      ...(devUserId ? { "x-dev-user-id": devUserId } : {}),
    },
  });
  if (error || !data) throw toBackendError(error, response);
  const run = zRunAccepted.parse(data); // Zod boundary validation
  return { runId: run.run_id, status: run.status };
}

/** Poll a run's status — the resilient fallback when the SSE stream drops. */
export async function readRun(runId: string): Promise<ReturnType<typeof zRunStatus.parse>> {
  const { token, devUserId } = await backendAuth();
  const { data, error, response } = await readRunV1RunsRunIdGet({
    path: { run_id: runId },
    auth: token,
    headers: devUserId ? { "x-dev-user-id": devUserId } : undefined,
  });
  if (error || !data) throw toBackendError(error, response);
  return zRunStatus.parse(data);
}
