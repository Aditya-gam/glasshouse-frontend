// @vitest-environment node
import { describe, expect, it } from "vitest";

import { GET } from "./route";

const req = (nonce?: string) =>
  new Request("http://localhost/docs", { headers: nonce ? { "x-nonce": nonce } : {} });

describe("GET /docs — Scalar API reference", () => {
  it("serves the reference HTML built from the vendored spec", async () => {
    const res = GET(req());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html");
    const html = await res.text();
    expect(html).toContain("Glasshouse API — Reference"); // pageTitle
    expect(html).toContain("/v1/runs"); // the embedded vendored spec, not a placeholder
  });

  it("stamps the per-request CSP nonce on the generated tags (strict CSP)", async () => {
    const html = await GET(req("test-nonce-123")).text();
    expect(html).toContain('nonce="test-nonce-123"');
  });

  it("emits no nonce attributes when the header is absent", async () => {
    const html = await GET(req()).text();
    expect(html).not.toContain("nonce=");
  });
});
