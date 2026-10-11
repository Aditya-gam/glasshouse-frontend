// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(async () => "test-jwt"),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken }) }));

import { getAccountConsents, grantConsent } from "./account";
import { BackendError } from "./backend";

const BASE = "http://localhost:8000";

/** A wire `AccountRead` exactly as FastAPI serializes it (explicit nulls). */
const WIRE_ACCOUNT = {
  consents: {
    self_audit: { granted: true, policy_version: "2026-10-11", granted_at: "2026-10-11T09:00:00Z" },
    art9_inference: { granted: false, policy_version: null, granted_at: null },
    decoy: { granted: false, policy_version: null, granted_at: null },
  },
  retention: "retain",
  current_policy_version: "2026-10-11",
  connected_accounts: [],
};

describe("getAccountConsents", () => {
  it("maps the wire account to the UI shape — snake→camel, nulls become absent keys", async () => {
    let auth: string | null = null;
    server.use(
      http.get(`${BASE}/v1/account`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json(WIRE_ACCOUNT);
      }),
    );

    const account = await getAccountConsents();

    expect(auth).toBe("Bearer test-jwt");
    expect(account).toEqual({
      selfAudit: { granted: true, policyVersion: "2026-10-11", grantedAt: "2026-10-11T09:00:00Z" },
      art9: { granted: false },
      decoy: { granted: false },
      retention: "retain",
      currentPolicyVersion: "2026-10-11",
    });
    expect(account.art9).not.toHaveProperty("policyVersion");
  });

  it("maps the 501 problem to a typed BackendError (pre-W1)", async () => {
    server.use(
      http.get(`${BASE}/v1/account`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "Not implemented yet", status: 501 },
          { status: 501 },
        ),
      ),
    );
    await expect(getAccountConsents()).rejects.toMatchObject({ status: 501 });
  });
});

describe("grantConsent", () => {
  it("POSTs the purpose with the policy version shown and returns the updated account", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/v1/account/consents`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(WIRE_ACCOUNT);
      }),
    );

    const result = await grantConsent("self_audit", "2026-10-11");

    expect(body).toEqual({ purpose: "self_audit", policy_version: "2026-10-11" });
    expect(result).toMatchObject({ selfAudit: { granted: true } });
  });

  it("maps the WC.1 stale-version 409 to 'stale_policy', never an exception", async () => {
    server.use(
      http.post(`${BASE}/v1/account/consents`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "Stale policy version", status: 409 },
          { status: 409 },
        ),
      ),
    );
    await expect(grantConsent("self_audit", "2025-01-01")).resolves.toBe("stale_policy");
  });

  it("throws a typed BackendError on any other failure", async () => {
    server.use(
      http.post(`${BASE}/v1/account/consents`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "Internal Server Error", status: 500 },
          { status: 500 },
        ),
      ),
    );
    await expect(grantConsent("self_audit", "2026-10-11")).rejects.toBeInstanceOf(BackendError);
  });
});
