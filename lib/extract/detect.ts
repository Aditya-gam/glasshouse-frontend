import { extractExport, type ExportPlatform, type ExtractOutcome } from "./extract";

/** `extractAnyExport`'s result: the detected platform rides along on success. */
export type DetectOutcome =
  | {
      ok: true;
      platform: ExportPlatform;
      files: Extract<ExtractOutcome, { ok: true }>["files"];
      totalBytes: number;
    }
  | { ok: false; code: Extract<ExtractOutcome, { ok: false }>["code"]; message: string };

/** Lower = reported in preference to higher (a specific failure beats "not recognised"). */
const ERROR_PRECEDENCE: Record<Extract<ExtractOutcome, { ok: false }>["code"], number> = {
  corrupt_zip: 0,
  over_cap: 1,
  member_missing: 2,
  unrecognized_export: 3,
};

/**
 * Detect which platform a user-selected export belongs to by trying each adapter's
 * allow-list against the zip's central directory (names only — nothing is inflated
 * until a platform matches). When neither matches, the most specific error wins;
 * two "not recognised" verdicts collapse into one combined message.
 */
export async function extractAnyExport(
  archive: Blob,
  options?: { maxBytes?: number },
): Promise<DetectOutcome> {
  const reddit = await extractExport(archive, "reddit", options);
  if (reddit.ok) {
    return { ok: true, platform: "reddit", files: reddit.files, totalBytes: reddit.totalBytes };
  }
  const x = await extractExport(archive, "x", options);
  if (x.ok) return { ok: true, platform: "x", files: x.files, totalBytes: x.totalBytes };

  if (reddit.code === "unrecognized_export" && x.code === "unrecognized_export") {
    return {
      ok: false,
      code: "unrecognized_export",
      message:
        "This doesn't look like a Reddit data export or an X archive. Upload the zip Reddit or X sent you — not a screenshot, folder, or re-saved copy.",
    };
  }
  return ERROR_PRECEDENCE[reddit.code] <= ERROR_PRECEDENCE[x.code] ? reddit : x;
}
