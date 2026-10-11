// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(async () => "test-jwt"),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken }) }));

import {
  eraseAccountAction,
  exportRunStatusAction,
  requestExportAction,
  updateConsentAction,
  updateRetentionAction,
} from "./actions";

const BASE = "http://localhost:8000";
const VERSION = "2026-10-11";

const WIRE_ACCOUNT = {
  consents: {
    self_audit: { granted: true, policy_version: VERSION, granted_at: "2026-10-11T09:00:00Z" },
    art9_inference: { granted: false, policy_version: null, granted_at: null },
    decoy: { granted: false, policy_version: null, granted_at: null },
  },
  retention: "discard",
  current_policy_version: VERSION,
  connected_accounts: [],
};

const stub501 = () =>
  HttpResponse.json(
    { type: "about:blank", title: "Not implemented", status: 501 },
    { status: 501 },
  );

describe("updateConsentAction", () => {
  it("revokes via DELETE /v1/account/consents/{purpose} and returns the re-read account", async () => {
    let deleted: string | undefined;
    server.use(
      http.delete(`${BASE}/v1/account/consents/:purpose`, ({ params }) => {
        deleted = params.purpose as string;
        return new HttpResponse(null, { status: 204 });
      }),
      http.get(`${BASE}/v1/account`, () => HttpResponse.json(WIRE_ACCOUNT)),
    );

    const result = await updateConsentAction({ purpose: "art9_inference", grant: false });

    expect(deleted).toBe("art9_inference");
    expect(result).toMatchObject({ ok: true, live: true, account: { retention: "discard" } });
  });

  it("grants with the shown policy version; refuses a version this build has no text for", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v1/account/consents`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(WIRE_ACCOUNT);
      }),
    );

    await updateConsentAction({ purpose: "decoy", grant: true, policyVersion: VERSION });
    expect(body).toEqual({ purpose: "decoy", policy_version: VERSION });

    const refused = await updateConsentAction({
      purpose: "decoy",
      grant: true,
      policyVersion: "1999-01-01",
    });
    expect(refused).toEqual({ ok: false, code: "error" });
  });

  it("maps the WC.1 409 to stale_policy", async () => {
    server.use(
      http.post(`${BASE}/v1/account/consents`, () =>
        HttpResponse.json({ type: "about:blank", title: "Stale", status: 409 }, { status: 409 }),
      ),
    );
    await expect(
      updateConsentAction({ purpose: "self_audit", grant: true, policyVersion: VERSION }),
    ).resolves.toEqual({ ok: false, code: "stale_policy" });
  });

  it("501 is the demo acknowledgement; a network failure is an error", async () => {
    server.use(http.delete(`${BASE}/v1/account/consents/:purpose`, stub501));
    await expect(updateConsentAction({ purpose: "decoy", grant: false })).resolves.toEqual({
      ok: true,
      live: false,
    });

    server.use(http.delete(`${BASE}/v1/account/consents/:purpose`, () => HttpResponse.error()));
    await expect(updateConsentAction({ purpose: "decoy", grant: false })).resolves.toEqual({
      ok: false,
      code: "error",
    });
  });

  it("rejects forged input", async () => {
    await expect(updateConsentAction({ purpose: "everything", grant: true })).resolves.toEqual({
      ok: false,
      code: "error",
    });
  });
});

describe("updateRetentionAction", () => {
  it("PUTs the retention mode and returns the updated account", async () => {
    let body: unknown;
    server.use(
      http.put(`${BASE}/v1/account/retention`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(WIRE_ACCOUNT);
      }),
    );
    const result = await updateRetentionAction({ retention: "discard" });
    expect(body).toEqual({ retention: "discard" });
    expect(result).toMatchObject({ ok: true, live: true, account: { retention: "discard" } });
  });

  it("501 → demo acknowledgement; bad input → error; network failure → error", async () => {
    server.use(http.put(`${BASE}/v1/account/retention`, stub501));
    await expect(updateRetentionAction({ retention: "discard" })).resolves.toEqual({
      ok: true,
      live: false,
    });
    await expect(updateRetentionAction({ retention: "forever" })).resolves.toEqual({
      ok: false,
      code: "error",
    });
    server.use(http.put(`${BASE}/v1/account/retention`, () => HttpResponse.error()));
    await expect(updateRetentionAction({ retention: "discard" })).resolves.toEqual({
      ok: false,
      code: "error",
    });
  });
});

describe("requestExportAction", () => {
  it("returns the export run id on 202", async () => {
    server.use(
      http.post(`${BASE}/v1/account/export`, () =>
        HttpResponse.json(
          { run_id: "11111111-1111-4111-8111-111111111111", status: "queued" },
          { status: 202 },
        ),
      ),
    );
    await expect(requestExportAction()).resolves.toEqual({
      ok: true,
      live: true,
      runId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("501 → demo acknowledgement without a run id; network failure → error", async () => {
    server.use(http.post(`${BASE}/v1/account/export`, stub501));
    await expect(requestExportAction()).resolves.toEqual({ ok: true, live: false });
    server.use(http.post(`${BASE}/v1/account/export`, () => HttpResponse.error()));
    await expect(requestExportAction()).resolves.toEqual({ ok: false, code: "error" });
  });
});

describe("exportRunStatusAction", () => {
  const RUN_ID = "11111111-1111-4111-8111-111111111111";

  it("returns the run's status via the existing run read (D2)", async () => {
    server.use(
      http.get(`${BASE}/v1/runs/${RUN_ID}`, () =>
        HttpResponse.json({ id: RUN_ID, type: "export", status: "succeeded" }),
      ),
    );
    await expect(exportRunStatusAction({ runId: RUN_ID })).resolves.toEqual({
      ok: true,
      status: "succeeded",
    });
  });

  it("rejects a forged run id without calling the backend", async () => {
    await expect(exportRunStatusAction({ runId: "not-a-uuid" })).resolves.toEqual({ ok: false });
  });

  it("reports a failed poll as not-ok (the caller keeps polling to its cap)", async () => {
    server.use(http.get(`${BASE}/v1/runs/${RUN_ID}`, () => HttpResponse.error()));
    await expect(exportRunStatusAction({ runId: RUN_ID })).resolves.toEqual({ ok: false });
  });
});

describe("eraseAccountAction", () => {
  it("returns live:true on the backend's 204 (the caller then removes the identity)", async () => {
    server.use(http.delete(`${BASE}/v1/account`, () => new HttpResponse(null, { status: 204 })));
    await expect(eraseAccountAction()).resolves.toEqual({ ok: true, live: true });
  });

  it("501 → demo acknowledgement (the caller must NOT touch the identity)", async () => {
    server.use(http.delete(`${BASE}/v1/account`, stub501));
    await expect(eraseAccountAction()).resolves.toEqual({ ok: true, live: false });
  });

  it("a real failure reports an error — nothing was removed", async () => {
    server.use(
      http.delete(`${BASE}/v1/account`, () =>
        HttpResponse.json({ type: "about:blank", title: "Boom", status: 500 }, { status: 500 }),
      ),
    );
    await expect(eraseAccountAction()).resolves.toEqual({ ok: false, code: "error" });
  });
});
