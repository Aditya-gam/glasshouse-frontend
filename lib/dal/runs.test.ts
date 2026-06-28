// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

// `getToken` is defined via vi.hoisted so it exists when the (hoisted) clerk mock factory
// and the imported DAL modules evaluate.
const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(async () => "test-jwt"),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken }) }));

import { BackendError } from "./backend";
import { createAttackRun, readRun } from "./runs";

const BASE = "http://localhost:8000";
// The generated Zod boundary enforces UUID on run ids — use a valid one.
const RUN_ID = "11111111-1111-4111-8111-111111111111";

describe("createAttackRun", () => {
  it("posts an attack run with the bearer token + Idempotency-Key and returns the handle", async () => {
    let seen: { auth: string | null; idem: string | null; body: unknown } | undefined;
    server.use(
      http.post(`${BASE}/v1/runs`, async ({ request }) => {
        seen = {
          auth: request.headers.get("authorization"),
          idem: request.headers.get("idempotency-key"),
          body: await request.json(),
        };
        return HttpResponse.json({ run_id: RUN_ID, status: "queued" }, { status: 202 });
      }),
    );

    const handle = await createAttackRun("location", "idem-1");

    expect(handle).toEqual({ runId: RUN_ID, status: "queued" });
    expect(seen?.auth).toBe("Bearer test-jwt");
    expect(seen?.idem).toBe("idem-1");
    expect(seen?.body).toEqual({ type: "attack", params: { attribute: "location" } });
  });

  it("maps a problem+json error to a typed BackendError carrying the status", async () => {
    server.use(
      http.post(`${BASE}/v1/runs`, () =>
        HttpResponse.json(
          {
            type: "about:blank",
            title: "Unprocessable Content",
            status: 422,
            detail: "bad attribute",
          },
          { status: 422 },
        ),
      ),
    );

    await expect(createAttackRun("location")).rejects.toBeInstanceOf(BackendError);
    await expect(createAttackRun("location")).rejects.toMatchObject({ status: 422 });
  });

  it("fails closed: with no Clerk token it sends no auth header and surfaces the backend 401", async () => {
    getToken.mockResolvedValueOnce(null);
    let authHeader: string | null = "unset";
    server.use(
      http.post(`${BASE}/v1/runs`, ({ request }) => {
        authHeader = request.headers.get("authorization");
        return HttpResponse.json(
          { type: "about:blank", title: "Unauthorized", status: 401 },
          { status: 401 },
        );
      }),
    );

    await expect(createAttackRun("location")).rejects.toMatchObject({ status: 401 });
    expect(authHeader).toBeNull();
  });

  it("rejects a malformed 202 body at the Zod boundary", async () => {
    server.use(
      http.post(`${BASE}/v1/runs`, () => HttpResponse.json({ wrong: "shape" }, { status: 202 })),
    );
    await expect(createAttackRun("location")).rejects.toThrow();
  });
});

describe("readRun", () => {
  it("polls and returns the validated run status", async () => {
    server.use(
      http.get(`${BASE}/v1/runs/${RUN_ID}`, () =>
        HttpResponse.json({ id: RUN_ID, type: "attack", status: "running" }, { status: 200 }),
      ),
    );

    await expect(readRun(RUN_ID)).resolves.toMatchObject({ id: RUN_ID, status: "running" });
  });
});
