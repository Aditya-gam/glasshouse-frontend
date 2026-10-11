// @vitest-environment node
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(async () => "test-jwt"),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken }) }));

import { grantConsents } from "./actions";

const BASE = "http://localhost:8000";
const VERSION = "2026-10-11"; // must exist in CONSENT_POLICIES — the action re-checks it

const accountAfterGrant = {
  consents: {
    self_audit: { granted: true, policy_version: VERSION, granted_at: "2026-10-11T09:00:00Z" },
    art9_inference: { granted: true, policy_version: VERSION, granted_at: "2026-10-11T09:00:01Z" },
    decoy: { granted: false, policy_version: null, granted_at: null },
  },
  retention: "retain",
  current_policy_version: VERSION,
  connected_accounts: [],
};

describe("grantConsents (server action)", () => {
  it("grants self_audit alone when Art. 9 was declined", async () => {
    const purposes: string[] = [];
    server.use(
      http.post(`${BASE}/v1/account/consents`, async ({ request }) => {
        purposes.push(((await request.json()) as { purpose: string }).purpose);
        return HttpResponse.json(accountAfterGrant);
      }),
    );

    const result = await grantConsents({ policyVersion: VERSION, art9: false });

    expect(purposes).toEqual(["self_audit"]);
    expect(result).toEqual({
      ok: true,
      live: true,
      grantedAt: "2026-10-11T09:00:00Z",
      art9Granted: true, // from the RETURNED account (a standing grant), not the request
    });
  });

  it("grants self_audit then art9_inference when the optional box was checked", async () => {
    const purposes: string[] = [];
    server.use(
      http.post(`${BASE}/v1/account/consents`, async ({ request }) => {
        purposes.push(((await request.json()) as { purpose: string }).purpose);
        return HttpResponse.json(accountAfterGrant);
      }),
    );

    const result = await grantConsents({ policyVersion: VERSION, art9: true });

    expect(purposes).toEqual(["self_audit", "art9_inference"]);
    expect(result).toMatchObject({ ok: true, live: true });
  });

  it("maps the WC.1 409 to stale_policy", async () => {
    server.use(
      http.post(`${BASE}/v1/account/consents`, () =>
        HttpResponse.json({ type: "about:blank", title: "Stale", status: 409 }, { status: 409 }),
      ),
    );
    await expect(grantConsents({ policyVersion: VERSION, art9: false })).resolves.toEqual({
      ok: false,
      code: "stale_policy",
    });
  });

  it("treats ONLY a documented 501 as the demo acknowledgement (live: false)", async () => {
    server.use(
      http.post(`${BASE}/v1/account/consents`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "Not implemented", status: 501 },
          { status: 501 },
        ),
      ),
    );
    await expect(grantConsents({ policyVersion: VERSION, art9: true })).resolves.toEqual({
      ok: true,
      live: false,
      art9Granted: true,
    });
  });

  it("a network failure against a live backend is an ERROR, never 'recorded'", async () => {
    server.use(http.post(`${BASE}/v1/account/consents`, () => HttpResponse.error()));
    await expect(grantConsents({ policyVersion: VERSION, art9: false })).resolves.toEqual({
      ok: false,
      code: "error",
    });
  });

  it("reports a failed optional Art. 9 grant honestly — required grant stands", async () => {
    let call = 0;
    server.use(
      http.post(`${BASE}/v1/account/consents`, () => {
        call += 1;
        if (call === 1) {
          return HttpResponse.json({
            ...accountAfterGrant,
            consents: {
              ...accountAfterGrant.consents,
              art9_inference: { granted: false, policy_version: null, granted_at: null },
            },
          });
        }
        return HttpResponse.json(
          { type: "about:blank", title: "Boom", status: 500 },
          { status: 500 },
        );
      }),
    );
    await expect(grantConsents({ policyVersion: VERSION, art9: true })).resolves.toEqual({
      ok: true,
      live: true,
      grantedAt: "2026-10-11T09:00:00Z",
      art9Granted: false,
      art9Error: true,
    });
  });

  it("refuses a policy version this build holds no text for (trust-boundary re-check)", async () => {
    let called = false;
    server.use(
      http.post(`${BASE}/v1/account/consents`, () => {
        called = true;
        return HttpResponse.json(accountAfterGrant);
      }),
    );
    await expect(grantConsents({ policyVersion: "1999-01-01", art9: false })).resolves.toEqual({
      ok: false,
      code: "error",
    });
    expect(called).toBe(false);
  });

  it("reports a real backend failure as an error — consent is NOT recorded", async () => {
    server.use(
      http.post(`${BASE}/v1/account/consents`, () =>
        HttpResponse.json({ type: "about:blank", title: "Boom", status: 500 }, { status: 500 }),
      ),
    );
    await expect(grantConsents({ policyVersion: VERSION, art9: false })).resolves.toEqual({
      ok: false,
      code: "error",
    });
  });

  it("rejects forged client input without calling the backend", async () => {
    let called = false;
    server.use(
      http.post(`${BASE}/v1/account/consents`, () => {
        called = true;
        return HttpResponse.json(accountAfterGrant);
      }),
    );
    await expect(grantConsents({ policyVersion: "", art9: "yes" })).resolves.toEqual({
      ok: false,
      code: "error",
    });
    expect(called).toBe(false);
  });
});
