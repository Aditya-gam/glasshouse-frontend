import "server-only";

import { LATEST_POLICY_VERSION } from "@/lib/consent/policy";
import { getAccount } from "@/lib/dal/account";
import { BackendError } from "@/lib/dal/backend";
import { CONNECTED_ACCOUNTS, type ConnectedAccount } from "@/lib/fixtures/account";
import type { IconName } from "@/lib/icons";
import type { AccountInfo } from "@/lib/schemas/account";

export interface AccountOverview {
  account: AccountInfo;
  /** The connections in the shape the screen renders (icon + display name). */
  connections: ConnectedAccount[];
  /** True when `account` came from the backend; false = demo fixtures (backend absent). */
  live: boolean;
}

const PLATFORM_ICONS: Record<string, IconName> = {
  reddit: "message-square",
  mastodon: "at-sign",
  x: "upload",
};

function toConnection(info: AccountInfo["connectedAccounts"][number]): ConnectedAccount {
  const platform = info.platform.toLowerCase();
  return {
    id: info.id,
    icon: PLATFORM_ICONS[platform] ?? "link",
    name: platform.charAt(0).toUpperCase() + platform.slice(1),
    handle: info.handle ?? "",
    status: info.status,
  };
}

/** The demo standing the screen shows while the backend is absent: a user mid-journey. */
const DEMO_ACCOUNT: AccountInfo = {
  selfAudit: {
    granted: true,
    grantedAt: "2026-06-25T09:00:00Z",
    policyVersion: LATEST_POLICY_VERSION,
  },
  art9: { granted: true, grantedAt: "2026-06-25T09:00:00Z", policyVersion: LATEST_POLICY_VERSION },
  decoy: { granted: false },
  retention: "retain",
  currentPolicyVersion: LATEST_POLICY_VERSION,
  connectedAccounts: [],
};

/**
 * The Account screen's data — LIVE via `GET /v1/account` (W1), demo fixtures when the
 * backend is unreachable or the route is still 501.
 */
export async function getAccountOverview(): Promise<AccountOverview> {
  try {
    const account = await getAccount();
    return { account, connections: account.connectedAccounts.map(toConnection), live: true };
  } catch (err) {
    // Demo fixtures ONLY for the stub era (route 501, or no backend at all). An
    // answering backend that errors must never be papered over with sample data on
    // the data-rights screen — let the error boundary render.
    const stubEra = err instanceof BackendError && (err.status === 501 || err.status === 0);
    if (!stubEra) throw err;
    const reason = err instanceof Error ? err.message : String(err);
    console.warn("[data/account] backend not available yet - serving demo fixtures:", reason);
    return { account: DEMO_ACCOUNT, connections: CONNECTED_ACCOUNTS, live: false };
  }
}
