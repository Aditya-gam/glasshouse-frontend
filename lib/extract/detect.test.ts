// @vitest-environment node
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { extractAnyExport } from "./detect";

const text = (value: string): Uint8Array => new TextEncoder().encode(value);

function makeZip(members: Record<string, string>): Blob {
  return new Blob([
    zipSync(
      Object.fromEntries(Object.entries(members).map(([name, value]) => [name, text(value)])),
    ) as BlobPart,
  ]);
}

describe("extractAnyExport (platform detection)", () => {
  it("detects a Reddit export", async () => {
    const result = await extractAnyExport(makeZip({ "comments.csv": "id,body\n" }));
    expect(result).toMatchObject({ ok: true, platform: "reddit" });
  });

  it("detects an X archive", async () => {
    const result = await extractAnyExport(
      makeZip({ "data/tweets.js": "window.YTD.tweets.part0 = []" }),
    );
    expect(result).toMatchObject({ ok: true, platform: "x" });
  });

  it("prefers the specific error over 'not recognised' (X archive missing tweets)", async () => {
    const result = await extractAnyExport(
      makeZip({ "data/account.js": "window.YTD.account.part0 = []" }),
    );
    expect(result).toMatchObject({ ok: false, code: "member_missing" });
    if (result.ok) throw new Error("unreachable");
    expect(result.message).toContain("tweets.js");
  });

  it("combines two 'not recognised' verdicts into one message naming both platforms", async () => {
    const result = await extractAnyExport(makeZip({ "notes.txt": "hello" }));
    expect(result).toMatchObject({ ok: false, code: "unrecognized_export" });
    if (result.ok) throw new Error("unreachable");
    expect(result.message).toContain("Reddit");
    expect(result.message).toContain("X archive");
  });

  it("prefers the specific error from the Reddit side too (CSV export missing the targets)", async () => {
    const result = await extractAnyExport(makeZip({ "statistics.csv": "kind,count\n" }));
    expect(result).toMatchObject({ ok: false, code: "member_missing" });
    if (result.ok) throw new Error("unreachable");
    expect(result.message).toContain("comments.csv");
  });

  it("a corrupt zip is corrupt regardless of platform", async () => {
    const result = await extractAnyExport(new Blob([new Uint8Array(64).fill(9)]));
    expect(result).toMatchObject({ ok: false, code: "corrupt_zip" });
  });

  it("honours the caller's cap", async () => {
    const result = await extractAnyExport(makeZip({ "comments.csv": "id,body\nrow\n" }), {
      maxBytes: 2,
    });
    expect(result).toMatchObject({ ok: false, code: "over_cap" });
  });
});
