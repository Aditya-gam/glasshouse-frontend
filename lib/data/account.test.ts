// @vitest-environment node
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { server } from "@/lib/mocks/node";

const { getToken } = vi.hoisted(() => ({
  getToken: vi.fn<() => Promise<string | null>>(async () => "test-jwt"),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ getToken }) }));

import { CONNECTED_ACCOUNTS } from "@/lib/fixtures/account";

import { getAccountOverview } from "./account";

const BASE = "http://localhost:8000";

const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
afterEach(() => warn.mockClear());

describe("getAccountOverview (live-first accessor)", () => {
  it("serves the LIVE account and maps connections to the screen shape", async () => {
    server.use(
      http.get(`${BASE}/v1/account`, () =>
        HttpResponse.json({
          consents: {
            self_audit: {
              granted: true,
              policy_version: "2026-10-11",
              granted_at: "2026-10-11T09:00:00Z",
            },
            art9_inference: { granted: false, policy_version: null, granted_at: null },
            decoy: { granted: false, policy_version: null, granted_at: null },
          },
          retention: "retain",
          current_policy_version: "2026-10-11",
          connected_accounts: [
            {
              id: "22222222-2222-4222-8222-222222222222",
              platform: "reddit",
              handle: "u/marta",
              status: "active",
            },
          ],
        }),
      ),
    );

    const overview = await getAccountOverview();

    expect(overview.live).toBe(true);
    expect(overview.connections).toEqual([
      {
        id: "22222222-2222-4222-8222-222222222222",
        icon: "message-square",
        name: "Reddit",
        handle: "u/marta",
        status: "active",
      },
    ]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("falls back to demo fixtures when the backend is unreachable, and logs it", async () => {
    server.use(http.get(`${BASE}/v1/account`, () => HttpResponse.error()));
    const overview = await getAccountOverview();
    expect(overview.live).toBe(false);
    expect(overview.account.selfAudit.granted).toBe(true); // a user mid-journey
    expect(overview.connections).toEqual(CONNECTED_ACCOUNTS);
    expect(warn).toHaveBeenCalledOnce();
  });
});
