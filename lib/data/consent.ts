import "server-only";

import { redirect } from "next/navigation";

import { LATEST_POLICY_VERSION } from "@/lib/consent/policy";
import { getAccount } from "@/lib/dal/account";
import { BackendError } from "@/lib/dal/backend";
import type { AccountInfo } from "@/lib/schemas/account";

export interface ConsentContext {
  account: AccountInfo;
  /** True when `account` came from the backend; false = demo defaults (backend absent). */
  live: boolean;
}

const UNGRANTED = { granted: false } as const;

/** Demo standing while the backend is absent: nothing granted, this build's policy text. */
const DEMO_ACCOUNT: AccountInfo = {
  selfAudit: UNGRANTED,
  art9: UNGRANTED,
  decoy: UNGRANTED,
  retention: "retain",
  currentPolicyVersion: LATEST_POLICY_VERSION,
  connectedAccounts: [],
};

/**
 * The consent standing the onboarding flow renders from — LIVE via `GET /v1/account`
 * (W1), demo defaults when the backend is unreachable or the route is still 501.
 */
export async function getConsentContext(): Promise<ConsentContext> {
  try {
    return { account: await getAccount(), live: true };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.warn("[data/consent] live account unavailable - serving demo defaults:", reason);
    return { account: DEMO_ACCOUNT, live: false };
  }
}

/**
 * The stub era: `GET /v1/account` is a documented 501 until backend W1, and the demo /
 * CI-parity environments run with no backend at all (connection refused → status 0).
 * Only these two outcomes leave the demo screens reachable. The live-flip PR after W1
 * DELETES this branch entirely and adds the test that a backend error denies access.
 */
function isStubEra(error: unknown): boolean {
  return error instanceof BackendError && (error.status === 501 || error.status === 0);
}

/**
 * The F1 route gate: app screens refuse to load without `self_audit` consent, checked
 * server-side here in the data layer (never in middleware/proxy). FAIL CLOSED: any
 * answering backend whose response isn't a valid account with `self_audit` granted —
 * 4xx, 5xx, or a body that fails the Zod boundary — denies and lands on the consent
 * step. The one narrow exception is the stub era above.
 */
export async function requireSelfAuditConsent(): Promise<void> {
  let granted: boolean;
  try {
    granted = (await getAccount()).selfAudit.granted;
  } catch (error) {
    if (isStubEra(error)) return;
    granted = false; // deny on 4xx/5xx/malformed — never fail open
  }
  if (!granted) redirect("/onboarding");
}
