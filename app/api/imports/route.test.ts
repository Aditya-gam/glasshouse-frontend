// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(async () => "test-jwt"),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken }) }));

import { POST } from "./route";

const BASE = "http://localhost:8000";

function multipartRequest(): Request {
  const form = new FormData();
  form.append("platform", "reddit");
  form.append("files", new Blob(["id,body\n"], { type: "text/csv" }), "comments.csv");
  return new Request("http://localhost:3000/api/imports", {
    method: "POST",
    body: form,
    headers: { "Idempotency-Key": "test-key-1" },
  });
}

describe("POST /api/imports (upload proxy)", () => {
  it("fails closed without any credential", async () => {
    getToken.mockResolvedValueOnce(null);
    expect((await POST(multipartRequest())).status).toBe(401);
  });

  it("injects the bearer, forwards the multipart body + idempotency key, passes the 202 through", async () => {
    let auth: string | null = null;
    let idempotency: string | null = null;
    let platform: FormDataEntryValue | null = null;
    server.use(
      http.post(`${BASE}/v1/imports`, async ({ request }) => {
        auth = request.headers.get("authorization");
        idempotency = request.headers.get("idempotency-key");
        platform = (await request.formData()).get("platform");
        return HttpResponse.json(
          { run_id: "11111111-1111-4111-8111-111111111111", status: "queued" },
          { status: 202 },
        );
      }),
    );

    const response = await POST(multipartRequest());

    expect(auth).toBe("Bearer test-jwt");
    expect(idempotency).toBe("test-key-1");
    expect(platform).toBe("reddit");
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({
      run_id: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("passes backend refusals through (413 over cap, 501 stub era)", async () => {
    server.use(
      http.post(`${BASE}/v1/imports`, () =>
        HttpResponse.json({ title: "too large" }, { status: 413 }),
      ),
    );
    expect((await POST(multipartRequest())).status).toBe(413);

    server.use(
      http.post(`${BASE}/v1/imports`, () => HttpResponse.json({ title: "nyi" }, { status: 501 })),
    );
    expect((await POST(multipartRequest())).status).toBe(501);
  });

  it("maps unreachability to a 502 with no internals", async () => {
    server.use(http.post(`${BASE}/v1/imports`, () => HttpResponse.error()));
    expect((await POST(multipartRequest())).status).toBe(502);
  });
});
