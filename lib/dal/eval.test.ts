// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

vi.mock("server-only", () => ({}));

import { BackendError } from "./backend";
import { getBenchmark } from "./eval";

const BASE = "http://localhost:8000";

describe("getBenchmark", () => {
  it("maps wire rows (0..1 codes) to display rows (% + labels); calibration passes through", async () => {
    let auth: string | null = "unset";
    server.use(
      http.get(`${BASE}/v1/eval/calibration`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({
          rows: [
            { label: "location", top1: 0.84, top3: 0.94 },
            { label: "income", top1: 0.52, top3: 0.74 },
          ],
          calibration: [
            [0.8, 0.76],
            [0.9, 0.85],
          ],
        });
      }),
    );

    const { bench, calib } = await getBenchmark();

    expect(auth).toBeNull(); // public read — no credential attached, by design
    expect(bench).toEqual([
      { label: "Location", top1: 84, top3: 94 },
      { label: "Income", top1: 52, top3: 74 },
    ]);
    expect(calib).toEqual([
      [0.8, 0.76],
      [0.9, 0.85],
    ]);
  });

  it("passes an empty benchmark through (no eval has run yet)", async () => {
    server.use(
      http.get(`${BASE}/v1/eval/calibration`, () =>
        HttpResponse.json({ rows: [], calibration: [] }),
      ),
    );
    await expect(getBenchmark()).resolves.toEqual({ bench: [], calib: [] });
  });

  it("maps a failure to a typed BackendError", async () => {
    server.use(
      http.get(`${BASE}/v1/eval/calibration`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "Internal Server Error", status: 500 },
          { status: 500 },
        ),
      ),
    );
    await expect(getBenchmark()).rejects.toBeInstanceOf(BackendError);
  });
});
