import "server-only";

import { listRemediationsV1RemediationsGet } from "@/lib/api";
import type { DefendEdit as WireEdit, DefendOptionRead, RemediationRead } from "@/lib/api";
import { zListRemediationsV1RemediationsGetResponse } from "@/lib/api/zod.gen";
import type { DefendEdit, DefendOption, DefendTarget } from "@/lib/fixtures/defend";

import { backendAuth, toBackendError } from "./backend";

/**
 * Remediations DAL — `GET /v1/remediations?inference_id=` (live at BE M3.8). Returns the
 * proven, advise-only defend frontier: the honest same-scale before/after (0..1 on both
 * ends — the defend screen renders these raw) plus the per-option edits.
 */

export type RemediationStatus = RemediationRead["status"];

export interface DefendFrontier {
  status: RemediationStatus;
  target: DefendTarget;
  options: DefendOption[];
}

/**
 * Wire edit → UI edit. The wire may carry pre-diffed `segs`; when it instead sends
 * `original`/`edited` text, synthesize a whole-segment diff (del original → ins edited) —
 * per the contract comment, "the FE diffs". Removals keep `original` for display.
 */
function toEdit(edit: WireEdit): DefendEdit {
  const synthesized =
    !edit.segs && (edit.edited != null || edit.original != null) && !edit.remove
      ? [
          ...(edit.original != null ? [{ t: "del" as const, v: edit.original }] : []),
          ...(edit.edited != null
            ? [{ t: edit.decoy ? ("insf" as const) : ("ins" as const), v: edit.edited }]
            : []),
        ]
      : undefined;
  return {
    src: edit.src,
    date: edit.date,
    ...(edit.segs ? { segs: edit.segs } : synthesized ? { segs: synthesized } : {}),
    ...(edit.remove != null ? { remove: edit.remove } : {}),
    ...(edit.original != null ? { original: edit.original } : {}),
    ...(edit.exif != null ? { exif: edit.exif } : {}),
    ...(edit.crop != null ? { crop: edit.crop } : {}),
    ...(edit.decoy != null ? { decoy: edit.decoy } : {}),
    ...(edit.note != null ? { note: edit.note } : {}),
  };
}

function toOption(option: DefendOptionRead): DefendOption {
  return {
    key: option.key,
    name: option.name,
    desc: option.desc,
    truthful: option.truthful,
    ...(option.recommended != null ? { recommended: option.recommended } : {}),
    ...(option.opt_in != null ? { optIn: option.opt_in } : {}),
    ...(option.remove != null ? { remove: option.remove } : {}),
    after: option.after.point,
    lo: option.after.lo,
    hi: option.after.hi,
    recovered: option.recovered,
    ...(option.misled != null ? { misled: option.misled } : {}),
    utility: option.utility,
    utilityLabel: option.utility_label,
    edits: option.edits.map(toEdit),
  };
}

function toFrontier(read: RemediationRead): DefendFrontier {
  return {
    status: read.status,
    target: {
      attribute: read.target.attribute,
      value: read.target.value,
      before: read.target.before.point,
      beforeLo: read.target.before.lo,
      beforeHi: read.target.before.hi,
    },
    options: read.options.map(toOption),
  };
}

/**
 * The newest proven frontier for one inference, or null when none exists yet. The endpoint
 * is RLS-scoped — a foreign inference id yields an empty list, not a 404 (no IDOR signal).
 */
export async function getDefendFrontier(inferenceId: string): Promise<DefendFrontier | null> {
  const { token, devUserId } = await backendAuth();
  const { data, error, response } = await listRemediationsV1RemediationsGet({
    query: { inference_id: inferenceId },
    auth: token,
    headers: devUserId ? { "x-dev-user-id": devUserId } : undefined,
  });
  if (error || !data) throw toBackendError(error, response);
  const reads = zListRemediationsV1RemediationsGetResponse.parse(data); // wire boundary
  return reads.length ? toFrontier(reads[0]) : null; // newest first per the contract
}
