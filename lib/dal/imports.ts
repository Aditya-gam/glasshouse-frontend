import "server-only";

import { listImportsV1ImportsGet } from "@/lib/api";
import type { ImportRead } from "@/lib/api";
import { zListImportsV1ImportsGetResponse } from "@/lib/api/zod.gen";

import { backendAuth, toBackendError } from "./backend";

/**
 * Imports DAL — `GET /v1/imports` (write-paths W2). An import row is a source +
 * its ingestion run; the kept/dropped counts land when the run finishes.
 */

export interface ImportInfo {
  id: string;
  platform?: string;
  status: string;
  runId?: string;
  keptCount?: number;
  droppedCount?: number;
}

function toImportInfo(read: ImportRead): ImportInfo {
  return {
    id: read.id,
    status: read.status,
    ...(read.platform != null ? { platform: read.platform } : {}),
    ...(read.run_id != null ? { runId: read.run_id } : {}),
    ...(read.kept_count != null ? { keptCount: read.kept_count } : {}),
    ...(read.dropped_count != null ? { droppedCount: read.dropped_count } : {}),
  };
}

/** The caller's imports, newest first (first page — the Connect flow needs the latest). */
export async function listImports(): Promise<ImportInfo[]> {
  const { token, devUserId } = await backendAuth();
  const { data, error, response } = await listImportsV1ImportsGet({
    auth: token,
    headers: devUserId ? { "x-dev-user-id": devUserId } : undefined,
  });
  if (error || !data) throw toBackendError(error, response);
  const page = zListImportsV1ImportsGetResponse.parse(data); // wire boundary
  return page.items.map(toImportInfo);
}
