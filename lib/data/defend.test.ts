// @vitest-environment node
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(async () => "test-jwt"),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken }) }));

import { OPTIONS, TARGET } from "@/lib/fixtures/defend";

import { getDefendSimulation } from "./defend";

const BASE = "http://localhost:8000";
const INFERENCE_ID = "8e7fab32-e609-4c9a-b970-0e13e6447236";

const WIRE = [
  {
    status: "within_noise",
    target: {
      attribute: "location",
      value: "Seattle, USA",
      before: { point: 0.86, lo: 0.8, hi: 0.9 },
    },
    options: [
      {
        key: "minimal",
        name: "Light edit",
        desc: "Generalize the leaking cue.",
        truthful: true,
        recommended: null,
        opt_in: null,
        remove: null,
        after: { point: 0.79, lo: 0.73, hi: 0.86 },
        recovered: true,
        misled: null,
        utility: 75,
        utility_label: "Mostly preserved",
        edits: [],
      },
    ],
  },
];

const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
afterEach(() => warn.mockClear());

describe("getDefendSimulation (live-first accessor)", () => {
  it("serves the LIVE frontier with the FE taxonomy label and the run's honest status", async () => {
    server.use(http.get(`${BASE}/v1/remediations`, () => HttpResponse.json(WIRE)));
    const sim = await getDefendSimulation(INFERENCE_ID);
    expect(sim.liveStatus).toBe("within_noise");
    expect(sim.target.attribute).toBe("Current location"); // "location" → taxonomy label
    expect(sim.target.before).toBe(0.86);
    expect(sim.options[0]).toMatchObject({ key: "minimal", after: 0.79 });
    expect(warn).not.toHaveBeenCalled();
  });

  it("serves fixtures without an inference id (no live handle in the read contract yet)", async () => {
    const sim = await getDefendSimulation();
    expect(sim.liveStatus).toBeUndefined();
    expect(sim.target).toEqual(TARGET);
    expect(sim.options).toEqual(OPTIONS);
  });

  it("falls back to fixtures when no frontier exists for the id, and logs it", async () => {
    server.use(http.get(`${BASE}/v1/remediations`, () => HttpResponse.json([])));
    const sim = await getDefendSimulation(INFERENCE_ID);
    expect(sim.liveStatus).toBeUndefined();
    expect(sim.target).toEqual(TARGET);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("falls back to fixtures when the backend is unreachable, and logs it", async () => {
    server.use(http.get(`${BASE}/v1/remediations`, () => HttpResponse.error()));
    const sim = await getDefendSimulation(INFERENCE_ID);
    expect(sim.liveStatus).toBeUndefined();
    expect(sim.target).toEqual(TARGET);
    expect(warn).toHaveBeenCalledOnce();
  });
});
