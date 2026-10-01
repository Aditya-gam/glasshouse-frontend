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
import { getAttributionDetail, listInferences } from "./inferences";

const BASE = "http://localhost:8000";
const RUN_ID = "11111111-1111-4111-8111-111111111111";
const INFERENCE_ID = "8e7fab32-e609-4c9a-b970-0e13e6447236";

/** A wire `AttributeRead` exactly as FastAPI serializes it (explicit nulls). */
const WIRE_LOCATION = {
  id: INFERENCE_ID,
  code: "location",
  label: "Current location",
  value: "Lisbon, Portugal",
  detail: "Alfama district",
  reliability: { point: 0.87, lo: 0.74, hi: 0.93 },
  evidence: "Tram 28 photos + timezone of posts",
  evidence_count: 3,
  abstain: false,
  sensitive: false,
  art9: false,
  severity: { atrisk: "high", jobseeker: "moderate" },
};

const WIRE_ABSTAIN = {
  code: "income",
  label: "Income band",
  value: null,
  detail: null,
  reliability: null, // null reliability ⇔ abstain (backend contract)
  evidence: "",
  evidence_count: null,
  abstain: true,
  sensitive: null,
  art9: null,
  severity: { atrisk: "low", jobseeker: "low" },
};

describe("listInferences", () => {
  it("maps wire AttributeReads to AttrItems — 0..1 reliability becomes %", async () => {
    let seen: { auth: string | null; url: string } | undefined;
    server.use(
      http.get(`${BASE}/v1/inferences`, ({ request }) => {
        seen = { auth: request.headers.get("authorization"), url: request.url };
        return HttpResponse.json([WIRE_LOCATION, WIRE_ABSTAIN]);
      }),
    );

    const items = await listInferences();

    expect(seen?.auth).toBe("Bearer test-jwt");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      id: INFERENCE_ID, // the detail handle (BE #55) passes through
      code: "location",
      value: "Lisbon, Portugal",
      reliability: 87,
      lo: 74,
      hi: 93,
      evidenceCount: 3,
      sev: { atrisk: "high", jobseeker: "moderate" },
    });
    // Abstain: no % fields at all, nulls normalized away (not leaked past .optional()).
    expect(items[1]).toMatchObject({ code: "income", abstain: true });
    expect(items[1]).not.toHaveProperty("reliability");
    expect(items[1]).not.toHaveProperty("sensitive");
  });

  it("scopes to a run via ?run_id=", async () => {
    let url: string | undefined;
    server.use(
      http.get(`${BASE}/v1/inferences`, ({ request }) => {
        url = request.url;
        return HttpResponse.json([]);
      }),
    );
    await listInferences(RUN_ID);
    expect(url).toContain(`run_id=${RUN_ID}`);
  });

  it("maps the 501 problem+json to a typed BackendError (the pre-M1.7 state)", async () => {
    server.use(
      http.get(`${BASE}/v1/inferences`, () =>
        HttpResponse.json(
          {
            type: "https://glasshouse.app/problems/not-implemented",
            title: "Not implemented yet",
            status: 501,
            detail: "calibrated inference reads land at M1.7+",
          },
          { status: 501 },
        ),
      ),
    );
    await expect(listInferences()).rejects.toBeInstanceOf(BackendError);
    await expect(listInferences()).rejects.toMatchObject({ status: 501 });
  });

  it("rejects contract drift at the UI boundary (unknown attribute code)", async () => {
    server.use(
      http.get(`${BASE}/v1/inferences`, () =>
        HttpResponse.json([{ ...WIRE_LOCATION, code: "not-in-taxonomy" }]),
      ),
    );
    await expect(listInferences()).rejects.toThrow();
  });
});

/** A wire `AttributeFindingRead` as the live backend serializes it (BE #55). */
const WIRE_DETAIL = {
  code: "location",
  label: "Location",
  value: "Seattle, USA",
  detail: null,
  reliability: { point: 0.86, lo: 0.8, hi: 0.9 },
  severity: { atrisk: "extreme", jobseeker: "moderate" },
  sensitive: false,
  art9: false,
  precision: "city",
  neighborhood: null,
  reasoning: "Posts reference Pike Place and SEA timezone.",
  candidates: [{ rank: 1, label: "Seattle, USA", note: "" }],
  text_only_reliability: { point: 0.74, lo: 0.7, hi: 0.78 },
  evidence_items: [
    {
      id: "itm_1",
      kind: "proven",
      type: "text",
      source: "Mastodon",
      date: "9 Mar",
      text: "Pike Place again",
      spans: ["Pike Place"],
      caption: null,
      region: null,
      exif: null,
      rationale: "Landmark specific to Seattle.",
      marginal: -21,
      proxy: null,
      citation: null,
    },
  ],
};

describe("getAttributionDetail", () => {
  it("maps the wire finding + evidence to the UI shapes (reliability 0..1 → %)", async () => {
    server.use(
      http.get(`${BASE}/v1/inferences/${INFERENCE_ID}`, () => HttpResponse.json(WIRE_DETAIL)),
    );
    const detail = await getAttributionDetail(INFERENCE_ID);
    expect(detail?.masked).toBe(false);
    expect(detail?.finding).toMatchObject({
      code: "location",
      value: "Seattle, USA",
      reliability: 86,
      lo: 80,
      hi: 90,
      textOnlyReliability: 74,
      neighborhood: null,
    });
    expect(detail?.evidence[0]).toMatchObject({
      id: "itm_1",
      kind: "proven",
      rationale: "Landmark specific to Seattle.",
      marginal: -21,
    });
    expect(detail?.evidence[0]).not.toHaveProperty("exif"); // nulls become absent keys
  });

  it("detects the consent-masked Art. 9 state (fail-closed nulls, severity kept)", async () => {
    server.use(
      http.get(`${BASE}/v1/inferences/${INFERENCE_ID}`, () =>
        HttpResponse.json({
          ...WIRE_DETAIL,
          code: "birthplace",
          label: "Birthplace",
          art9: true,
          value: null,
          reasoning: "",
          candidates: [],
          evidence_items: [],
        }),
      ),
    );
    const detail = await getAttributionDetail(INFERENCE_ID);
    expect(detail?.masked).toBe(true);
    expect(detail?.finding.value).toBeNull();
    expect(detail?.finding.reliability).toBe(86); // reliability is NOT masked
  });

  it("returns null on 404 (absent or another user's — RLS, no IDOR signal)", async () => {
    server.use(
      http.get(`${BASE}/v1/inferences/${INFERENCE_ID}`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "Not Found", status: 404 },
          { status: 404 },
        ),
      ),
    );
    await expect(getAttributionDetail(INFERENCE_ID)).resolves.toBeNull();
  });

  it("returns null for an uncalibrated finding (never renders a raw number as calibrated)", async () => {
    server.use(
      http.get(`${BASE}/v1/inferences/${INFERENCE_ID}`, () =>
        HttpResponse.json({ ...WIRE_DETAIL, reliability: null }),
      ),
    );
    await expect(getAttributionDetail(INFERENCE_ID)).resolves.toBeNull();
  });

  it("throws a typed BackendError on a non-404 failure", async () => {
    server.use(
      http.get(`${BASE}/v1/inferences/${INFERENCE_ID}`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "Internal Server Error", status: 500 },
          { status: 500 },
        ),
      ),
    );
    await expect(getAttributionDetail(INFERENCE_ID)).rejects.toBeInstanceOf(BackendError);
  });
});
