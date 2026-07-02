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
import { listInferences } from "./inferences";

const BASE = "http://localhost:8000";
const RUN_ID = "11111111-1111-4111-8111-111111111111";

/** A wire `AttributeRead` exactly as FastAPI serializes it (explicit nulls). */
const WIRE_LOCATION = {
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
