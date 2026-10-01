// @vitest-environment node
import { http, HttpResponse, type JsonBodyType } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(async () => "test-jwt"),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken }) }));

import { EVIDENCE, GENERIC_WHY, LOCATION, LOCATION_WHY } from "@/lib/fixtures/attribution";

import { getAttribution } from "./attribution";

const BASE = "http://localhost:8000";
const INFERENCE_ID = "8e7fab32-e609-4c9a-b970-0e13e6447236";

const WIRE_ITEM = {
  id: INFERENCE_ID,
  code: "location",
  label: "Current location",
  value: "Lisbon, Portugal",
  detail: null,
  reliability: { point: 0.87, lo: 0.74, hi: 0.93 },
  evidence: "Tram 28 photos",
  evidence_count: 3,
  abstain: false,
  sensitive: false,
  art9: false,
  severity: { atrisk: "high", jobseeker: "moderate" },
};

const WIRE_DETAIL = {
  code: "location",
  label: "Current location",
  value: "Lisbon, Portugal",
  detail: null,
  reliability: { point: 0.87, lo: 0.74, hi: 0.93 },
  severity: { atrisk: "high", jobseeker: "moderate" },
  sensitive: false,
  art9: false,
  precision: "city",
  neighborhood: "Alfama",
  reasoning: "Tram 28 photos + the timezone of posts.",
  candidates: [{ rank: 1, label: "Lisbon, Portugal", note: "" }],
  text_only_reliability: null,
  evidence_items: [
    {
      id: "itm_1",
      kind: "proven",
      type: "photo",
      source: "Instagram",
      date: "2 Mar",
      text: null,
      spans: null,
      caption: "Tram 28 again",
      region: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
      exif: null,
      rationale: "The livery is unique to Lisbon.",
      marginal: -34,
      proxy: null,
      citation: null,
    },
  ],
};

const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
afterEach(() => warn.mockClear());

function serveList(items: JsonBodyType) {
  server.use(http.get(`${BASE}/v1/inferences`, () => HttpResponse.json(items)));
}

function serveDetail(detail: JsonBodyType) {
  server.use(http.get(`${BASE}/v1/inferences/${INFERENCE_ID}`, () => HttpResponse.json(detail)));
}

describe("getAttribution (live-first accessor)", () => {
  it("resolves code → id → LIVE detail, threading the inference id to Defend", async () => {
    serveList([WIRE_ITEM]);
    serveDetail(WIRE_DETAIL);

    const a = await getAttribution("location");

    expect(a.state).toBeUndefined();
    expect(a.inferenceId).toBe(INFERENCE_ID);
    expect(a.masked).toBe(false);
    expect(a.why).toBe(LOCATION_WHY);
    expect(a.finding).toMatchObject({
      code: "location",
      value: "Lisbon, Portugal",
      reliability: 87,
      neighborhood: "Alfama",
    });
    expect(a.evidence[0]).toMatchObject({ id: "itm_1", kind: "proven", marginal: -34 });
    expect(warn).not.toHaveBeenCalled();
  });

  it("uses the generic persona copy for non-location codes", async () => {
    serveList([{ ...WIRE_ITEM, code: "income", label: "Income band" }]);
    serveDetail({ ...WIRE_DETAIL, code: "income", label: "Income band" });

    const a = await getAttribution("income");

    expect(a.why).toBe(GENERIC_WHY);
    expect(a.finding.code).toBe("income");
  });

  it("passes the consent-masked Art. 9 state through", async () => {
    serveList([{ ...WIRE_ITEM, code: "birthplace", label: "Birthplace", art9: true, value: null }]);
    serveDetail({
      ...WIRE_DETAIL,
      code: "birthplace",
      label: "Birthplace",
      art9: true,
      value: null,
      reasoning: "",
      candidates: [],
      evidence_items: [],
    });

    const a = await getAttribution("birthplace");

    expect(a.masked).toBe(true);
    expect(a.state).toBeUndefined(); // a real state, never a broken/empty detail
    expect(a.finding.value).toBeNull();
  });

  it("maps no-inference-for-this-code to the honest empty state", async () => {
    serveList([WIRE_ITEM]);
    const a = await getAttribution("income");
    expect(a.state).toBe("empty");
    expect(a.inferenceId).toBeUndefined();
  });

  it("maps an abstained inference to the honest empty state (no detail fetch)", async () => {
    serveList([{ ...WIRE_ITEM, abstain: true }]);
    const a = await getAttribution("location");
    expect(a.state).toBe("empty");
  });

  it("maps an uncalibrated detail (reliability null) to the honest empty state", async () => {
    serveList([WIRE_ITEM]);
    serveDetail({ ...WIRE_DETAIL, reliability: null });
    const a = await getAttribution("location");
    expect(a.state).toBe("empty");
  });

  it("falls back to the location demo fixtures when the backend is unreachable, and logs it", async () => {
    server.use(http.get(`${BASE}/v1/inferences`, () => HttpResponse.error()));
    const a = await getAttribution("location");
    expect(a.state).toBeUndefined();
    expect(a.finding).toBe(LOCATION);
    expect(a.evidence).toBe(EVIDENCE);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("falls back to the empty state for non-location codes when unreachable", async () => {
    server.use(http.get(`${BASE}/v1/inferences`, () => HttpResponse.error()));
    const a = await getAttribution("income");
    expect(a.state).toBe("empty");
    expect(warn).toHaveBeenCalledOnce();
  });
});
