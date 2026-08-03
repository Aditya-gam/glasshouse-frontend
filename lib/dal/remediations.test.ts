// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(async () => "test-jwt"),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken }) }));

import { BackendError } from "./backend";
import { getDefendFrontier } from "./remediations";

const BASE = "http://localhost:8000";
const INFERENCE_ID = "8e7fab32-e609-4c9a-b970-0e13e6447236";

/** A wire `RemediationRead` captured VERBATIM from the live backend (M3.8, seeded run). */
const WIRE_PROVEN = {
  status: "proven",
  target: {
    attribute: "location",
    value: "Seattle, USA",
    before: { point: 0.86, lo: 0.8, hi: 0.9 },
  },
  options: [
    {
      key: "minimal",
      name: "Light edit",
      desc: "Generalize the leaking cue — keeps the most of what you said.",
      truthful: true,
      recommended: null,
      opt_in: null,
      remove: null,
      after: { point: 0.21, lo: 0.1, hi: 0.3 },
      recovered: false,
      misled: null,
      utility: 75,
      utility_label: "Mostly preserved",
      edits: [
        {
          src: "a",
          date: "",
          segs: null,
          remove: null,
          original: "I live in Seattle",
          edited: "I live near a nearby city",
          exif: null,
          crop: null,
          decoy: null,
          note: null,
        },
      ],
    },
    {
      key: "remove",
      name: "Remove",
      desc: "Delete the item — maximum truthful privacy.",
      truthful: true,
      recommended: null,
      opt_in: null,
      remove: true,
      after: { point: 0.21, lo: 0.1, hi: 0.3 },
      recovered: false,
      misled: null,
      utility: 75,
      utility_label: "Mostly preserved",
      edits: [
        {
          src: "a",
          date: "",
          segs: null,
          remove: true,
          original: "I live in Seattle",
          edited: null,
          exif: null,
          crop: null,
          decoy: null,
          note: null,
        },
      ],
    },
  ],
};

describe("getDefendFrontier", () => {
  it("maps the live proven frontier — honest same-scale 0..1 before/after", async () => {
    let seen: { auth: string | null; url: string } | undefined;
    server.use(
      http.get(`${BASE}/v1/remediations`, ({ request }) => {
        seen = { auth: request.headers.get("authorization"), url: request.url };
        return HttpResponse.json([WIRE_PROVEN]);
      }),
    );

    const frontier = await getDefendFrontier(INFERENCE_ID);

    expect(seen?.auth).toBe("Bearer test-jwt");
    expect(seen?.url).toContain(`inference_id=${INFERENCE_ID}`);
    expect(frontier?.status).toBe("proven");
    // the 0.86 → 0.21 before/after, same scale on both ends
    expect(frontier?.target).toEqual({
      attribute: "location",
      value: "Seattle, USA",
      before: 0.86,
      beforeLo: 0.8,
      beforeHi: 0.9,
    });
    expect(frontier?.options[0]).toMatchObject({
      key: "minimal",
      after: 0.21,
      lo: 0.1,
      hi: 0.3,
      utility: 75,
      utilityLabel: "Mostly preserved",
    });
    // nulls never leak past the UI's optional fields
    expect(frontier?.options[0]).not.toHaveProperty("recommended");
    expect(frontier?.options[0]).not.toHaveProperty("misled");
  });

  it("synthesizes a diff when the wire sends original/edited without segs (the FE diffs)", async () => {
    server.use(http.get(`${BASE}/v1/remediations`, () => HttpResponse.json([WIRE_PROVEN])));
    const frontier = await getDefendFrontier(INFERENCE_ID);
    expect(frontier?.options[0].edits[0].segs).toEqual([
      { t: "del", v: "I live in Seattle" },
      { t: "ins", v: "I live near a nearby city" },
    ]);
    // a removal keeps the original for display and gets no synthesized segs
    expect(frontier?.options[1].edits[0]).toMatchObject({
      remove: true,
      original: "I live in Seattle",
    });
    expect(frontier?.options[1].edits[0].segs).toBeUndefined();
  });

  it("passes pre-diffed segs through untouched (incl. the decoy insf falsehood marker)", async () => {
    const withSegs = structuredClone(WIRE_PROVEN);
    withSegs.options[0].edits[0].segs = [
      { t: "eq", v: "settling into " },
      { t: "insf", v: "Madrid" },
    ] as never;
    server.use(http.get(`${BASE}/v1/remediations`, () => HttpResponse.json([withSegs])));
    const frontier = await getDefendFrontier(INFERENCE_ID);
    expect(frontier?.options[0].edits[0].segs).toEqual([
      { t: "eq", v: "settling into " },
      { t: "insf", v: "Madrid" },
    ]);
  });

  it("returns null for an empty list (no frontier yet / RLS-hidden foreign id)", async () => {
    server.use(http.get(`${BASE}/v1/remediations`, () => HttpResponse.json([])));
    await expect(getDefendFrontier(INFERENCE_ID)).resolves.toBeNull();
  });

  it("maps a problem+json failure to a typed BackendError", async () => {
    server.use(
      http.get(`${BASE}/v1/remediations`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "Internal Server Error", status: 500 },
          { status: 500 },
        ),
      ),
    );
    await expect(getDefendFrontier(INFERENCE_ID)).rejects.toBeInstanceOf(BackendError);
  });
});
