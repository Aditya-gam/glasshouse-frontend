import {
  BlobReader,
  BlobWriter,
  ERR_ENCRYPTED,
  ERR_UNSUPPORTED_ENCRYPTION,
  ZipReader,
  type FileEntry,
} from "@zip.js/zip.js/lib/zip-core.js";

/**
 * In-browser export extraction (write-paths plan, D3): pull only the members the
 * ingestion adapter needs out of a user-selected archive, so a multi-gigabyte X
 * archive never leaves the device whole. The zip is read by central directory with
 * ranged `Blob.slice` reads — member content outside the allow-list is never read.
 *
 * Everything read from the archive is untrusted input: member names are matched by
 * exact allow-list only (never treated as paths), declared sizes are capped before
 * any byte is inflated, and extracted bytes are CRC-verified. Nothing from the
 * archive is ever logged.
 *
 * Residual risk, accepted: a forged end-of-central-directory record can make the
 * reader materialize a large central directory before entries are yielded. That
 * costs memory in the user's own tab only — no content leaves the device and no
 * server resource is touched — so it is not defended beyond the entry-count cap.
 */

export type ExportPlatform = "reddit" | "x";

export type ExtractErrorCode =
  "unrecognized_export" | "member_missing" | "over_cap" | "corrupt_zip";

export interface ExtractedMember {
  /** Canonical member basename (from the allow-list), used as the upload filename. */
  name: string;
  data: Blob;
  bytes: number;
}

export type ExtractOutcome =
  | { ok: true; files: ExtractedMember[]; totalBytes: number }
  | { ok: false; code: ExtractErrorCode; message: string };

/** D3's server-side upload cap, mirrored client-side (callers may pass the env value). */
export const DEFAULT_UPLOAD_CAP_BYTES = 50 * 1024 * 1024;

/** A central directory larger than this is not a consumer data export. */
const MAX_ENTRIES_SCANNED = 100_000;

/** `comments.csv` / `posts.csv` (Reddit exports are a flat zip of CSVs). */
const REDDIT_TARGET_RE = /^(comments|posts)\.csv$/;
/** Any CSV at the top level — the "this is a Reddit export" signal. */
const REDDIT_SIGNAL_RE = /^[^/]+\.csv$/;
/** `data/tweets.js` plus the `data/tweets-part1.js`… siblings of large archives. */
const X_TWEETS_RE = /^data\/tweets(?:-part(\d+))?\.js$/;
/** The pre-December-2022 X archive layout (singular `tweet.js`). */
const X_LEGACY_RE = /^data\/tweet(?:-part\d+)?\.js$/;
/** Members every current X archive carries — the "this is an X archive" signal. */
const X_SIGNALS = new Set(["data/account.js", "data/manifest.js"]);

const MEMBER_CONTENT_TYPES: Record<string, string> = {
  ".csv": "text/csv",
  ".js": "text/javascript",
};

const MB = 1024 * 1024;

/** Rounded UP to 0.1 MB so an over-cap total can never display equal to the cap. */
function megabytesUp(bytes: number): string {
  return (Math.ceil((bytes / MB) * 10) / 10).toFixed(1);
}

function fail(code: ExtractErrorCode, message: string): ExtractOutcome {
  return { ok: false, code, message };
}

const CORRUPT = fail(
  "corrupt_zip",
  "The archive couldn't be read — it may be incomplete or damaged. Re-download the export and try again.",
);

const ENCRYPTED = fail(
  "corrupt_zip",
  "This archive is password-protected, which isn't supported. Export an unprotected archive and try again.",
);

interface Candidate {
  /** The member path with any single wrapping directory removed. */
  rest: string;
  entry: FileEntry;
  /** Sort key for X tweet files: tweets.js first, then parts in numeric order. */
  order: number;
}

interface Scan {
  /** Allow-listed candidates, grouped by wrapping prefix ("" = archive root). */
  byPrefix: Map<string, Candidate[]>;
  redditSignal: boolean;
  xSignal: boolean;
  xLegacy: boolean;
  tooManyEntries: boolean;
}

/**
 * One pass over the central directory (names and declared sizes only — no content
 * is read here). Members are matched at the root and under one wrapping directory,
 * because users unzip an export to look inside and re-zip it. The scan is streaming:
 * only allow-listed entries are retained.
 */
async function scanEntries(zipReader: ZipReader<unknown>, platform: ExportPlatform): Promise<Scan> {
  const scan: Scan = {
    byPrefix: new Map(),
    redditSignal: false,
    xSignal: false,
    xLegacy: false,
    tooManyEntries: false,
  };
  let count = 0;

  for await (const entry of zipReader.getEntriesGenerator()) {
    if (++count > MAX_ENTRIES_SCANNED) {
      scan.tooManyEntries = true;
      return scan;
    }
    if (entry.directory) continue;

    // The member itself, and the member with one wrapping directory stripped.
    const views: Array<[prefix: string, rest: string]> = [["", entry.filename]];
    const slash = entry.filename.indexOf("/");
    if (slash > 0) views.push([entry.filename.slice(0, slash), entry.filename.slice(slash + 1)]);

    for (const [prefix, rest] of views) {
      if (REDDIT_SIGNAL_RE.test(rest)) scan.redditSignal = true;
      if (X_SIGNALS.has(rest)) scan.xSignal = true;
      if (X_LEGACY_RE.test(rest)) scan.xLegacy = true;

      if (platform === "reddit") {
        if (REDDIT_TARGET_RE.test(rest)) {
          const group = scan.byPrefix.get(prefix) ?? [];
          group.push({ rest, entry, order: 0 });
          scan.byPrefix.set(prefix, group);
        }
      } else {
        const match = X_TWEETS_RE.exec(rest);
        if (match) {
          const group = scan.byPrefix.get(prefix) ?? [];
          group.push({ rest, entry, order: match[1] === undefined ? -1 : Number(match[1]) });
          scan.byPrefix.set(prefix, group);
        }
      }
    }
  }
  return scan;
}

/**
 * Pick the members to extract: the archive root wins over a wrapping directory;
 * otherwise the prefix with the most matches. Duplicate member names (legal in a
 * zip's central directory, warned but yielded by the reader) keep the first
 * occurrence only, so one upload filename maps to exactly one payload.
 */
function selectCandidates(scan: Scan): Candidate[] {
  const best = [...scan.byPrefix.entries()].sort((a, b) =>
    a[0] === "" ? -1 : b[0] === "" ? 1 : b[1].length - a[1].length,
  )[0];
  const seen = new Set<string>();
  const unique: Candidate[] = [];
  for (const candidate of best?.[1] ?? []) {
    if (seen.has(candidate.rest)) continue;
    seen.add(candidate.rest);
    unique.push(candidate);
  }
  return unique.sort((a, b) => a.order - b.order);
}

function unrecognized(platform: ExportPlatform, scan: Scan): ExtractOutcome {
  if (platform === "reddit" && (scan.xSignal || scan.xLegacy)) {
    return fail(
      "unrecognized_export",
      "This looks like an X archive, not a Reddit export. Switch the platform to X, or request a Reddit export at reddit.com/settings/data-request.",
    );
  }
  if (platform === "x" && scan.redditSignal) {
    return fail(
      "unrecognized_export",
      "This looks like a Reddit export, not an X archive. Switch the platform to Reddit, or request an X archive from your X settings.",
    );
  }
  return platform === "reddit"
    ? fail(
        "unrecognized_export",
        "This doesn't look like a Reddit data export. Request one at reddit.com/settings/data-request and upload the zip Reddit sends back.",
      )
    : fail(
        "unrecognized_export",
        "This doesn't look like an X archive. Request one under X Settings → Download an archive of your data, and upload the zip.",
      );
}

function memberMissing(platform: ExportPlatform, scan: Scan): ExtractOutcome {
  if (platform === "x" && scan.xLegacy) {
    return fail(
      "member_missing",
      "This X archive uses the pre-2023 format, which isn't supported. Request a fresh archive from X and upload that instead.",
    );
  }
  return platform === "reddit"
    ? fail(
        "member_missing",
        "This Reddit export doesn't contain comments.csv or posts.csv, so there's nothing to analyze. If you just requested it, Reddit may still be preparing the full export.",
      )
    : fail(
        "member_missing",
        "This X archive doesn't contain data/tweets.js, so there's nothing to analyze. Request a full archive from X and upload that.",
      );
}

function isEncryptionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message === ERR_ENCRYPTED || error.message === ERR_UNSUPPORTED_ENCRYPTION)
  );
}

/**
 * Extract the members the `platform` ingestion adapter needs from a user-selected
 * export archive, without reading the rest of the archive.
 *
 * Returns `{ok: true}` with the extracted members, or `{ok: false}` with one of the
 * four user-facing error states from the write-paths plan: the archive isn't a
 * recognised export for `platform`, the expected member is missing, the extracted
 * payload would exceed the upload cap, or the zip can't be read safely.
 */
export async function extractExport(
  archive: Blob,
  platform: ExportPlatform,
  options?: { maxBytes?: number },
): Promise<ExtractOutcome> {
  const maxBytes = options?.maxBytes ?? DEFAULT_UPLOAD_CAP_BYTES;
  const zipReader = new ZipReader(new BlobReader(archive), { useWebWorkers: false });
  try {
    let scan: Scan;
    try {
      scan = await scanEntries(zipReader, platform);
    } catch (error) {
      // Unreadable or malformed archive (bad EOCD/central directory, encryption, …).
      return isEncryptionError(error) ? ENCRYPTED : CORRUPT;
    }
    if (scan.tooManyEntries) {
      return fail(
        "unrecognized_export",
        "This archive contains far more files than a data export — it doesn't look like a supported export.",
      );
    }

    const selected = selectCandidates(scan);
    if (selected.length === 0) {
      const looksRight = platform === "reddit" ? scan.redditSignal : scan.xSignal || scan.xLegacy;
      return looksRight ? memberMissing(platform, scan) : unrecognized(platform, scan);
    }
    if (selected.some(({ entry }) => entry.encrypted)) return ENCRYPTED;

    // Cap check from declared sizes alone — nothing has been inflated yet.
    const totalBytes = selected.reduce((sum, { entry }) => sum + entry.uncompressedSize, 0);
    if (totalBytes > maxBytes) {
      return fail(
        "over_cap",
        `The files to upload come to ${megabytesUp(totalBytes)} MB, above the ${(maxBytes / MB).toFixed(1)} MB limit.`,
      );
    }

    const files: ExtractedMember[] = [];
    for (const { rest, entry } of selected) {
      const name = rest.split("/").at(-1) ?? rest;
      const extension = name.slice(name.lastIndexOf("."));
      let data: Blob;
      try {
        data = await entry.getData(new BlobWriter(MEMBER_CONTENT_TYPES[extension] ?? ""), {
          checkCrc32: true,
        });
      } catch (error) {
        // CRC mismatch, truncated or oversized member data, unsupported compression, …
        return isEncryptionError(error) ? ENCRYPTED : CORRUPT;
      }
      // Backstop only: the reader itself aborts on declared-size mismatches.
      if (data.size !== entry.uncompressedSize) return CORRUPT;
      files.push({ name, data, bytes: data.size });
    }
    return { ok: true, files, totalBytes };
  } finally {
    await zipReader.close();
  }
}
