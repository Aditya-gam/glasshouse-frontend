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
import { listImports } from "./imports";

const BASE = "http://localhost:8000";

describe("listImports", () => {
  it("maps the wire ImportPage to UI shapes — nulls become absent keys", async () => {
    let auth: string | null = null;
    server.use(
      http.get(`${BASE}/v1/imports`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({
          items: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              platform: "reddit",
              status: "succeeded",
              run_id: "11111111-1111-4111-8111-111111111111",
              kept_count: 42,
              dropped_count: 7,
              created_at: "2026-10-11T09:00:00Z",
            },
            {
              id: "33333333-3333-4333-8333-333333333333",
              platform: null,
              status: "running",
              run_id: null,
              kept_count: null,
              dropped_count: null,
              created_at: null,
            },
          ],
          next_cursor: null,
        });
      }),
    );

    const imports = await listImports();

    expect(auth).toBe("Bearer test-jwt");
    expect(imports[0]).toEqual({
      id: "22222222-2222-4222-8222-222222222222",
      platform: "reddit",
      status: "succeeded",
      runId: "11111111-1111-4111-8111-111111111111",
      keptCount: 42,
      droppedCount: 7,
    });
    expect(imports[1]).toEqual({ id: "33333333-3333-4333-8333-333333333333", status: "running" });
  });

  it("maps the 501 problem to a typed BackendError (pre-W2)", async () => {
    server.use(
      http.get(`${BASE}/v1/imports`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "Not implemented", status: 501 },
          { status: 501 },
        ),
      ),
    );
    await expect(listImports()).rejects.toBeInstanceOf(BackendError);
  });
});
