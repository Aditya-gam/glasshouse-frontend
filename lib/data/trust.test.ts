// @vitest-environment node
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

vi.mock("server-only", () => ({}));

import { BENCH } from "@/lib/fixtures/trust";

import { getTrustBenchmark } from "./trust";

const BASE = "http://localhost:8000";

const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
afterEach(() => warn.mockClear());

describe("getTrustBenchmark (live-first accessor)", () => {
  it("serves LIVE numbers when the endpoint responds", async () => {
    server.use(
      http.get(`${BASE}/v1/eval/calibration`, () =>
        HttpResponse.json({
          rows: [{ label: "location", top1: 0.84, top3: 0.94 }],
          calibration: [[0.8, 0.76]],
        }),
      ),
    );
    const t = await getTrustBenchmark();
    expect(t.live).toBe(true);
    expect(t.bench).toEqual([{ label: "Location", top1: 84, top3: 94 }]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("passes a LIVE EMPTY benchmark through — 'no eval yet', never the fixture numbers", async () => {
    server.use(
      http.get(`${BASE}/v1/eval/calibration`, () =>
        HttpResponse.json({ rows: [], calibration: [] }),
      ),
    );
    const t = await getTrustBenchmark();
    expect(t).toEqual({ bench: [], calib: [], live: true });
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back to the illustrative fixtures when the backend is unreachable, and logs it", async () => {
    server.use(http.get(`${BASE}/v1/eval/calibration`, () => HttpResponse.error()));
    const t = await getTrustBenchmark();
    expect(t.live).toBe(false);
    expect(t.bench).toEqual(BENCH);
    expect(warn).toHaveBeenCalledOnce();
  });
});
