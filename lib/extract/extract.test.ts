// @vitest-environment node
import { zipSync, type Zippable, type ZippableFile } from "fflate";
import { describe, expect, it } from "vitest";

import { DEFAULT_UPLOAD_CAP_BYTES, extractExport } from "./extract";

const text = (value: string): Uint8Array => new TextEncoder().encode(value);

/** Build a real zip in memory. fflate is the WRITER here on purpose — an
 *  implementation independent of the zip.js read path under test. */
function makeZip(members: Record<string, ZippableFile | string>): Blob {
  const zippable: Zippable = Object.fromEntries(
    Object.entries(members).map(([name, value]) => [
      name,
      typeof value === "string" ? text(value) : value,
    ]),
  );
  return new Blob([zipSync(zippable) as BlobPart], { type: "application/zip" });
}

/**
 * Splice two single-member zips (same member name) into one archive whose central
 * directory legally carries the name twice — fflate can't author that, so the hostile
 * fixture is assembled by hand: [localA][localB][cdA][cdB'][EOCD], where cdB' has its
 * local-header offset patched and the EOCD counts both entries.
 */
function makeDuplicateZip(name: string, a: string, b: string): Blob {
  const parse = (z: Uint8Array) => {
    const v = new DataView(z.buffer, z.byteOffset, z.byteLength);
    const eocd = z.length - 22; // fflate writes no archive comment
    const cdSize = v.getUint32(eocd + 12, true);
    const cdOffset = v.getUint32(eocd + 16, true);
    return { local: z.slice(0, cdOffset), cd: z.slice(cdOffset, cdOffset + cdSize) };
  };
  const A = parse(zipSync({ [name]: text(a) }));
  const B = parse(zipSync({ [name]: text(b) }));
  const cdB = B.cd.slice();
  new DataView(cdB.buffer).setUint32(42, A.local.length, true); // relocated local header
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, 2, true);
  ev.setUint16(10, 2, true);
  ev.setUint32(12, A.cd.length + cdB.length, true);
  ev.setUint32(16, A.local.length + B.local.length, true);
  return new Blob([A.local, B.local, A.cd, cdB, eocd] as BlobPart[]);
}

const COMMENTS =
  "id,permalink,date,ip,subreddit,gildings,link,parent,body\nc1,/r/x,2026-01-01,,,x,,,hello\n";
const POSTS =
  "id,permalink,date,ip,subreddit,gildings,title,url,body\np1,/r/x,2026-01-01,,,x,t,,world\n";
const TWEETS = `window.YTD.tweets.part0 = [\n  { "tweet": { "id_str": "1", "full_text": "hi" } }\n]\n`;
const TWEETS_PART1 = `window.YTD.tweets.part1 = [\n  { "tweet": { "id_str": "2", "full_text": "again" } }\n]\n`;

const REDDIT_EXPORT = {
  "comments.csv": COMMENTS,
  "posts.csv": POSTS,
  "statistics.csv": "kind,count\ncomment,1\n",
  "chat_history.csv": "id\n",
};

const X_EXPORT = {
  "Your archive.html": "<html></html>",
  "data/manifest.js": 'window.__THAR_CONFIG = {"userInfo":{}}',
  "data/account.js": 'window.YTD.account.part0 = [{"account":{}}]',
  "data/tweets.js": TWEETS,
  "data/tweets_media/1-photo.jpg": new Uint8Array(2048).fill(7),
};

describe("extractExport — reddit", () => {
  it("extracts comments.csv and posts.csv from the root, nothing else", async () => {
    const result = await extractExport(makeZip(REDDIT_EXPORT), "reddit");
    if (!result.ok) throw new Error(result.message);
    expect(result.files.map((f) => f.name).sort()).toEqual(["comments.csv", "posts.csv"]);
    expect(result.totalBytes).toBe(text(COMMENTS).length + text(POSTS).length);
    await expect(result.files.find((f) => f.name === "comments.csv")?.data.text()).resolves.toBe(
      COMMENTS,
    );
  });

  it("tolerates one wrapping directory (re-zipped exports)", async () => {
    const result = await extractExport(
      makeZip({ "reddit-export/comments.csv": COMMENTS, "reddit-export/posts.csv": POSTS }),
      "reddit",
    );
    if (!result.ok) throw new Error(result.message);
    expect(result.files.map((f) => f.name).sort()).toEqual(["comments.csv", "posts.csv"]);
  });

  it("prefers root members over a wrapping directory when both exist", async () => {
    const result = await extractExport(
      makeZip({
        "comments.csv": COMMENTS,
        "old-export/comments.csv": "id\nstale\n",
        "old-export/posts.csv": "id\nstale\n",
      }),
      "reddit",
    );
    if (!result.ok) throw new Error(result.message);
    // Root wins even when the wrapped set is more complete — pinned as the decided
    // behavior: the archive's own layout outranks a leftover folder inside it.
    expect(result.files.map((f) => f.name)).toEqual(["comments.csv"]);
    await expect(result.files[0].data.text()).resolves.toBe(COMMENTS);
  });

  it("extracts the one target present when the other is absent", async () => {
    const result = await extractExport(makeZip({ "comments.csv": COMMENTS }), "reddit");
    if (!result.ok) throw new Error(result.message);
    expect(result.files.map((f) => f.name)).toEqual(["comments.csv"]);
  });

  it("member_missing: a CSV export without the target files", async () => {
    const result = await extractExport(
      makeZip({ "statistics.csv": "kind,count\n", "chat_history.csv": "id\n" }),
      "reddit",
    );
    expect(result).toMatchObject({ ok: false, code: "member_missing" });
  });

  it("unrecognized_export: a zip that is no export at all", async () => {
    const result = await extractExport(makeZip({ "notes.txt": "hello" }), "reddit");
    expect(result).toMatchObject({ ok: false, code: "unrecognized_export" });
  });

  it("unrecognized_export: an X archive uploaded as Reddit names the mix-up", async () => {
    const result = await extractExport(makeZip(X_EXPORT), "reddit");
    expect(result).toMatchObject({ ok: false, code: "unrecognized_export" });
    if (result.ok) throw new Error("unreachable");
    expect(result.message).toContain("X archive");
  });
});

describe("extractExport — x", () => {
  it("extracts data/tweets.js", async () => {
    const result = await extractExport(makeZip(X_EXPORT), "x");
    if (!result.ok) throw new Error(result.message);
    expect(result.files.map((f) => f.name)).toEqual(["tweets.js"]);
    await expect(result.files[0].data.text()).resolves.toBe(TWEETS);
  });

  it("extracts tweets-part*.js siblings of large archives, in order", async () => {
    const result = await extractExport(
      makeZip({ ...X_EXPORT, "data/tweets-part1.js": TWEETS_PART1 }),
      "x",
    );
    if (!result.ok) throw new Error(result.message);
    expect(result.files.map((f) => f.name)).toEqual(["tweets.js", "tweets-part1.js"]);
  });

  it("member_missing: an X archive without data/tweets.js", async () => {
    const rest = Object.fromEntries(
      Object.entries(X_EXPORT).filter(([name]) => name !== "data/tweets.js"),
    );
    const result = await extractExport(makeZip(rest), "x");
    expect(result).toMatchObject({ ok: false, code: "member_missing" });
  });

  it("member_missing: the pre-2023 legacy format gets its own guidance", async () => {
    const result = await extractExport(
      makeZip({ "data/tweet.js": "window.YTD.tweet.part0 = []" }),
      "x",
    );
    expect(result).toMatchObject({ ok: false, code: "member_missing" });
    if (result.ok) throw new Error("unreachable");
    expect(result.message).toContain("pre-2023");
  });

  it("unrecognized_export: a Reddit export uploaded as X names the mix-up", async () => {
    const result = await extractExport(makeZip(REDDIT_EXPORT), "x");
    expect(result).toMatchObject({ ok: false, code: "unrecognized_export" });
    if (result.ok) throw new Error("unreachable");
    expect(result.message).toContain("Reddit export");
  });

  it("tolerates one wrapping directory, same as Reddit (re-zipped archives)", async () => {
    const wrapped = Object.fromEntries(
      Object.entries(X_EXPORT).map(([name, value]) => [`twitter-2026/${name}`, value]),
    );
    const result = await extractExport(makeZip(wrapped), "x");
    if (!result.ok) throw new Error(result.message);
    expect(result.files.map((f) => f.name)).toEqual(["tweets.js"]);
  });

  it("orders part files numerically, not lexicographically (part2 before part10)", async () => {
    const parts = Object.fromEntries(
      [10, 2, 1].map((n) => [`data/tweets-part${n}.js`, `window.YTD.tweets.part${n} = []`]),
    );
    const result = await extractExport(makeZip({ ...X_EXPORT, ...parts }), "x");
    if (!result.ok) throw new Error(result.message);
    expect(result.files.map((f) => f.name)).toEqual([
      "tweets.js",
      "tweets-part1.js",
      "tweets-part2.js",
      "tweets-part10.js",
    ]);
  });
});

describe("extractExport — caps and corruption", () => {
  it("over_cap: refused from declared sizes alone, before any inflation", async () => {
    // 51 MB of zeros compresses to ~50 kB — the fixture is tiny, the declared size is not.
    const huge = new Uint8Array(51 * 1024 * 1024);
    const result = await extractExport(makeZip({ ...X_EXPORT, "data/tweets.js": huge }), "x");
    expect(result).toMatchObject({ ok: false, code: "over_cap" });
    if (result.ok) throw new Error("unreachable");
    expect(result.message).toContain("51.0 MB");
    expect(result.message).toContain("50.0 MB");
  });

  it("honours a caller-supplied cap", async () => {
    const result = await extractExport(makeZip(REDDIT_EXPORT), "reddit", { maxBytes: 10 });
    expect(result).toMatchObject({ ok: false, code: "over_cap" });
  });

  it("corrupt_zip: not a zip at all", async () => {
    const result = await extractExport(new Blob([new Uint8Array(4096).fill(42)]), "reddit");
    expect(result).toMatchObject({ ok: false, code: "corrupt_zip" });
  });

  it("corrupt_zip: a truncated archive", async () => {
    const whole = makeZip(REDDIT_EXPORT);
    const result = await extractExport(whole.slice(0, Math.floor(whole.size / 2)), "reddit");
    expect(result).toMatchObject({ ok: false, code: "corrupt_zip" });
  });

  it("corrupt_zip: member data that fails its CRC check", async () => {
    const bytes = new Uint8Array(await makeZip({ "comments.csv": COMMENTS }).arrayBuffer());
    // Flip bits inside the member's compressed data (after the 30-byte local header
    // + 12-byte filename), leaving the central directory intact.
    bytes[48] = bytes[48] ^ 0xff;
    const result = await extractExport(new Blob([bytes]), "reddit");
    expect(result).toMatchObject({ ok: false, code: "corrupt_zip" });
  });

  it("allows a payload exactly at the cap", async () => {
    const result = await extractExport(makeZip({ "comments.csv": COMMENTS }), "reddit", {
      maxBytes: text(COMMENTS).length,
    });
    expect(result).toMatchObject({ ok: true });
  });

  it("over_cap just past the cap never displays total == limit", async () => {
    const result = await extractExport(
      makeZip({ "comments.csv": [new Uint8Array(50 * 1024 * 1024 + 1), { level: 6 }] }),
      "reddit",
    );
    expect(result).toMatchObject({ ok: false, code: "over_cap" });
    if (result.ok) throw new Error("unreachable");
    expect(result.message).toContain("50.1 MB");
    expect(result.message).toContain("50.0 MB limit");
  });

  it("extracts an empty (0-byte) member without error", async () => {
    const result = await extractExport(makeZip({ "comments.csv": "" }), "reddit");
    if (!result.ok) throw new Error(result.message);
    expect(result.files).toEqual([{ name: "comments.csv", data: expect.any(Blob), bytes: 0 }]);
  });

  it("corrupt_zip: a STORED member whose bytes fail the CRC check (pins checkCrc32)", async () => {
    // level 0 = stored: a flipped content byte keeps the length (the size guard passes)
    // and inflate never runs, so ONLY the CRC-32 verification can catch it.
    const bytes = new Uint8Array(
      await makeZip({ "comments.csv": [text(COMMENTS), { level: 0 }] }).arrayBuffer(),
    );
    // Content starts after the 30-byte local header + 12-byte filename.
    bytes[50] = bytes[50] ^ 0xff;
    const result = await extractExport(new Blob([bytes]), "reddit");
    expect(result).toMatchObject({ ok: false, code: "corrupt_zip" });
  });

  it("keeps the first occurrence when the central directory repeats a member name", async () => {
    const archive = makeDuplicateZip("data/tweets.js", TWEETS, "window.YTD.tweets.part0 = [666]");
    const result = await extractExport(archive, "x");
    if (!result.ok) throw new Error(result.message);
    expect(result.files.map((f) => f.name)).toEqual(["tweets.js"]);
    await expect(result.files[0].data.text()).resolves.toBe(TWEETS);
  });

  it("exposes the 50 MB default cap", () => {
    expect(DEFAULT_UPLOAD_CAP_BYTES).toBe(50 * 1024 * 1024);
  });
});

describe("extractExport — never reads the whole archive", () => {
  it("reads only the tail, the central directory, and the selected members", async () => {
    // An X archive padded with ~8 MB of media, STORED uncompressed (level 0) so the
    // archive is genuinely large and the padding bytes must NOT be read.
    const media: Record<string, ZippableFile> = {};
    for (let i = 0; i < 8; i++) {
      media[`data/tweets_media/${i}-photo.jpg`] = [
        new Uint8Array(1024 * 1024).fill(i),
        { level: 0 },
      ];
    }
    const archive = makeZip({ ...X_EXPORT, ...media });

    let bytesRead = 0;
    const slices: Array<[number, number]> = [];
    // Whole-blob reads (arrayBuffer/bytes/text/stream on the root) defeat the ranged-read
    // guarantee silently, so the spy makes them throw instead of going uncounted.
    const WHOLE_BLOB_READS = new Set(["arrayBuffer", "bytes", "text", "stream"]);
    const spied = new Proxy(archive, {
      get(target, prop) {
        if (prop === "slice") {
          return (start?: number, end?: number, contentType?: string) => {
            const from = start ?? 0;
            const to = end ?? target.size;
            bytesRead += to - from;
            slices.push([from, to]);
            return target.slice(from, to, contentType);
          };
        }
        if (typeof prop === "string" && WHOLE_BLOB_READS.has(prop)) {
          return () => {
            throw new Error(`whole-archive read via Blob.${prop}()`);
          };
        }
        const value = Reflect.get(target, prop, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });

    const result = await extractExport(spied, "x");
    if (!result.ok) throw new Error(result.message);
    expect(result.files.map((f) => f.name)).toEqual(["tweets.js"]);

    // The archive is ~8 MB; listing + extracting tweets.js must stay in the tens of kB.
    expect(archive.size).toBeGreaterThan(8 * 1024 * 1024);
    expect(slices.length).toBeGreaterThan(0);
    expect(bytesRead).toBeLessThan(128 * 1024);
  });
});
