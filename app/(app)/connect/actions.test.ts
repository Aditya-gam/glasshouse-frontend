// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(async () => "test-jwt"),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken }) }));

import { importSummaryAction, ingestionStatusAction } from "./actions";

const BASE = "http://localhost:8000";
const RUN_ID = "11111111-1111-4111-8111-111111111111";

describe("ingestionStatusAction", () => {
  it("returns the run's status; rejects forged ids terminally WITHOUT calling the backend", async () => {
    let calls = 0;
    server.use(
      http.get(`${BASE}/v1/runs/${RUN_ID}`, () => {
        calls += 1;
        return HttpResponse.json({ id: RUN_ID, type: "ingestion", status: "running" });
      }),
    );
    await expect(ingestionStatusAction({ runId: RUN_ID })).resolves.toEqual({
      ok: true,
      status: "running",
    });
    expect(calls).toBe(1);
    await expect(ingestionStatusAction({ runId: "nope" })).resolves.toEqual({
      ok: false,
      terminal: true,
    });
    expect(calls).toBe(1); // the forged id never reached the wire
  });

  it("classifies a 404 as TERMINAL (stop polling) and a 5xx/network failure as transient", async () => {
    server.use(
      http.get(`${BASE}/v1/runs/${RUN_ID}`, () =>
        HttpResponse.json({ title: "nope", status: 404 }, { status: 404 }),
      ),
    );
    await expect(ingestionStatusAction({ runId: RUN_ID })).resolves.toEqual({
      ok: false,
      terminal: true,
    });

    server.use(http.get(`${BASE}/v1/runs/${RUN_ID}`, () => HttpResponse.error()));
    await expect(ingestionStatusAction({ runId: RUN_ID })).resolves.toEqual({ ok: false });
  });
});

describe("importSummaryAction", () => {
  it("finds the run's import row and returns its counts", async () => {
    server.use(
      http.get(`${BASE}/v1/imports`, () =>
        HttpResponse.json({
          items: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              platform: "reddit",
              status: "succeeded",
              run_id: RUN_ID,
              kept_count: 42,
              dropped_count: 7,
              created_at: null,
            },
          ],
          next_cursor: null,
        }),
      ),
    );
    await expect(importSummaryAction({ runId: RUN_ID })).resolves.toEqual({
      ok: true,
      kept: 42,
      dropped: 7,
    });
  });

  it("reports not-ok when the row is missing or counts haven't landed", async () => {
    server.use(
      http.get(`${BASE}/v1/imports`, () => HttpResponse.json({ items: [], next_cursor: null })),
    );
    await expect(importSummaryAction({ runId: RUN_ID })).resolves.toEqual({ ok: false });
  });
});
