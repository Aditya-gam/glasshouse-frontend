// @vitest-environment node
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(async () => "test-jwt"),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken }) }));

import { ATTRIBUTES } from "@/lib/fixtures/attributes";

import { getAttributes } from "./attributes";

const BASE = "http://localhost:8000";

const WIRE = [
  {
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
  },
];

const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
afterEach(() => warn.mockClear());

describe("getAttributes (live-first accessor)", () => {
  it("serves LIVE inferences when the endpoint responds", async () => {
    server.use(http.get(`${BASE}/v1/inferences`, () => HttpResponse.json(WIRE)));
    const items = await getAttributes();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ code: "location", reliability: 87 });
    expect(warn).not.toHaveBeenCalled();
  });

  it("passes an EMPTY live result through (a real user with no runs) — never fixtures", async () => {
    server.use(http.get(`${BASE}/v1/inferences`, () => HttpResponse.json([])));
    await expect(getAttributes()).resolves.toEqual([]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back to fixtures on the backend 501 (endpoint not yet live) and logs it", async () => {
    server.use(
      http.get(`${BASE}/v1/inferences`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "Not implemented yet", status: 501 },
          { status: 501 },
        ),
      ),
    );
    const items = await getAttributes();
    expect(items).toHaveLength(ATTRIBUTES.length);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("falls back to fixtures when the backend is unreachable", async () => {
    server.use(http.get(`${BASE}/v1/inferences`, () => HttpResponse.error()));
    const items = await getAttributes();
    expect(items).toHaveLength(ATTRIBUTES.length);
    expect(warn).toHaveBeenCalledOnce();
  });
});
