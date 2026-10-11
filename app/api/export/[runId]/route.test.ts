// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(async () => "test-jwt"),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken }) }));

import { GET } from "./route";

const BASE = "http://localhost:8000";
const RUN_ID = "11111111-1111-4111-8111-111111111111";

const call = () =>
  GET(new Request(`http://localhost:3000/api/export/${RUN_ID}`), {
    params: Promise.resolve({ runId: RUN_ID }),
  });

describe("GET /api/export/[runId] (download proxy)", () => {
  it("fails closed without any credential", async () => {
    getToken.mockResolvedValueOnce(null);
    const response = await call();
    expect(response.status).toBe(401);
  });

  it("injects the bearer and streams the bundle through", async () => {
    let auth: string | null = null;
    server.use(
      http.get(`${BASE}/v1/account/export/${RUN_ID}`, ({ request }) => {
        auth = request.headers.get("authorization");
        return new HttpResponse("bundle-bytes", {
          headers: {
            "Content-Type": "application/zip",
            "Content-Disposition": "attachment; filename=export.zip",
          },
        });
      }),
    );

    const response = await call();

    expect(auth).toBe("Bearer test-jwt");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/zip");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.text()).resolves.toBe("bundle-bytes");
  });

  it("passes the meaningful denials through (expired / not the owner / not ready)", async () => {
    server.use(
      http.get(`${BASE}/v1/account/export/${RUN_ID}`, () =>
        HttpResponse.json({ title: "Gone" }, { status: 410 }),
      ),
    );
    expect((await call()).status).toBe(410);
  });

  it("maps other upstream failures and unreachability to a 502 with no internals", async () => {
    server.use(
      http.get(`${BASE}/v1/account/export/${RUN_ID}`, () =>
        HttpResponse.json({ title: "boom", detail: "secret-internals" }, { status: 500 }),
      ),
    );
    const upstream500 = await call();
    expect(upstream500.status).toBe(502);
    await expect(upstream500.text()).resolves.not.toContain("secret-internals");

    server.use(http.get(`${BASE}/v1/account/export/${RUN_ID}`, () => HttpResponse.error()));
    expect((await call()).status).toBe(502);
  });
});
