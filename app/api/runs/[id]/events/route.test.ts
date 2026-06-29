// @vitest-environment node
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(async () => "test-jwt"),
}));
vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken }) }));

import { GET } from "./route";

const BASE = "http://localhost:8000";
const RUN_ID = "11111111-1111-4111-8111-111111111111";
const ctx = { params: Promise.resolve({ id: RUN_ID }) };
const req = () => new Request("http://localhost/api/runs/x/events");

afterEach(() => getToken.mockResolvedValue("test-jwt"));

describe("SSE proxy — GET /api/runs/[id]/events", () => {
  it("fails closed with 401 when there is no credential", async () => {
    getToken.mockResolvedValueOnce(null); // no token + DEV_USER_ID unset ⇒ no auth
    const res = await GET(req(), ctx);
    expect(res.status).toBe(401);
  });

  it("injects the bearer server-side and streams the backend events (200, text/event-stream)", async () => {
    let authHeader: string | null = null;
    server.use(
      http.get(`${BASE}/v1/runs/${RUN_ID}/events`, ({ request }) => {
        authHeader = request.headers.get("authorization");
        return new HttpResponse("event: status\ndata: {}\n\n", {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        });
      }),
    );
    const res = await GET(req(), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(authHeader).toBe("Bearer test-jwt"); // token never reaches the client
  });

  it("returns 502 when the upstream stream is not OK", async () => {
    server.use(
      http.get(`${BASE}/v1/runs/${RUN_ID}/events`, () => new HttpResponse(null, { status: 503 })),
    );
    expect((await GET(req(), ctx)).status).toBe(502);
  });

  it("returns 502 (not a 500 crash) when the backend is unreachable", async () => {
    server.use(http.get(`${BASE}/v1/runs/${RUN_ID}/events`, () => HttpResponse.error()));
    expect((await GET(req(), ctx)).status).toBe(502);
  });
});
