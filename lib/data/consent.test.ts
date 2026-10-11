// @vitest-environment node
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

const { getToken, redirect } = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(async () => "test-jwt"),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken }) }));
vi.mock("next/navigation", () => ({ redirect }));

import { LATEST_POLICY_VERSION } from "@/lib/consent/policy";

import { getConsentContext, requireSelfAuditConsent } from "./consent";

const BASE = "http://localhost:8000";

const account = (selfAuditGranted: boolean) => ({
  consents: {
    self_audit: {
      granted: selfAuditGranted,
      policy_version: selfAuditGranted ? "2026-10-11" : null,
      granted_at: selfAuditGranted ? "2026-10-11T09:00:00Z" : null,
    },
    art9_inference: { granted: false, policy_version: null, granted_at: null },
    decoy: { granted: false, policy_version: null, granted_at: null },
  },
  retention: "retain",
  current_policy_version: "2026-10-11",
  connected_accounts: [],
});

const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
afterEach(() => {
  warn.mockClear();
  redirect.mockClear();
});

describe("getConsentContext (live-first accessor)", () => {
  it("serves the LIVE account when the endpoint responds", async () => {
    server.use(http.get(`${BASE}/v1/account`, () => HttpResponse.json(account(true))));
    const ctx = await getConsentContext();
    expect(ctx.live).toBe(true);
    expect(ctx.account.selfAudit.granted).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it("serves demo defaults (nothing granted) when the backend is unreachable, and logs it", async () => {
    server.use(http.get(`${BASE}/v1/account`, () => HttpResponse.error()));
    const ctx = await getConsentContext();
    expect(ctx.live).toBe(false);
    expect(ctx.account.selfAudit.granted).toBe(false);
    expect(ctx.account.currentPolicyVersion).toBe(LATEST_POLICY_VERSION);
    expect(warn).toHaveBeenCalledOnce();
  });
});

describe("requireSelfAuditConsent (the F1 route gate)", () => {
  it("redirects to /onboarding when the LIVE account has no self_audit consent", async () => {
    server.use(http.get(`${BASE}/v1/account`, () => HttpResponse.json(account(false))));
    await expect(requireSelfAuditConsent()).rejects.toThrow("NEXT_REDIRECT:/onboarding");
    expect(redirect).toHaveBeenCalledWith("/onboarding");
  });

  it("passes when the LIVE account holds self_audit consent", async () => {
    server.use(http.get(`${BASE}/v1/account`, () => HttpResponse.json(account(true))));
    await expect(requireSelfAuditConsent()).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("stub era: stays permissive ONLY on 501 (route not implemented yet)", async () => {
    server.use(
      http.get(`${BASE}/v1/account`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "Not implemented", status: 501 },
          { status: 501 },
        ),
      ),
    );
    await expect(requireSelfAuditConsent()).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("stub era: stays permissive when no backend exists at all (connection refused)", async () => {
    server.use(http.get(`${BASE}/v1/account`, () => HttpResponse.error()));
    await expect(requireSelfAuditConsent()).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("FAILS CLOSED on a backend 5xx — an answering backend that errors denies", async () => {
    server.use(
      http.get(`${BASE}/v1/account`, () =>
        HttpResponse.json({ type: "about:blank", title: "Boom", status: 500 }, { status: 500 }),
      ),
    );
    await expect(requireSelfAuditConsent()).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });

  it("FAILS CLOSED on an unauthenticated 401", async () => {
    server.use(
      http.get(`${BASE}/v1/account`, () =>
        HttpResponse.json(
          { type: "about:blank", title: "Unauthorized", status: 401 },
          { status: 401 },
        ),
      ),
    );
    await expect(requireSelfAuditConsent()).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });

  it("FAILS CLOSED on a 200 whose body fails the Zod boundary (missing consents)", async () => {
    server.use(
      http.get(`${BASE}/v1/account`, () =>
        HttpResponse.json({ retention: "retain", current_policy_version: "2026-10-11" }),
      ),
    );
    await expect(requireSelfAuditConsent()).rejects.toThrow("NEXT_REDIRECT:/onboarding");
  });
});
