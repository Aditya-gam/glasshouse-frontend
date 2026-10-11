import "server-only";

import { getAccountV1AccountGet, grantConsentV1AccountConsentsPost } from "@/lib/api";
import type { AccountRead, ConsentState as WireConsentState } from "@/lib/api";
import {
  zGetAccountV1AccountGetResponse,
  zGrantConsentV1AccountConsentsPostResponse,
} from "@/lib/api/zod.gen";
import {
  accountConsentsSchema,
  type AccountConsents,
  type ConsentPurpose,
} from "@/lib/schemas/account";

import { backendAuth, toBackendError } from "./backend";

/**
 * Account DAL — consent standing and grants (write-paths D4/WC.1). F1 needs read +
 * grant; revoke, retention, export and erasure join in F3.
 */

function toConsentState(wire: WireConsentState): unknown {
  return {
    granted: wire.granted,
    ...(wire.granted_at != null ? { grantedAt: wire.granted_at } : {}),
    ...(wire.policy_version != null ? { policyVersion: wire.policy_version } : {}),
  };
}

function toAccountConsents(read: AccountRead): AccountConsents {
  return accountConsentsSchema.parse({
    selfAudit: toConsentState(read.consents.self_audit),
    art9: toConsentState(read.consents.art9_inference),
    decoy: toConsentState(read.consents.decoy),
    retention: read.retention,
    currentPolicyVersion: read.current_policy_version,
  }); // UI boundary
}

/** The caller's consent standing + the policy version grants must cite (WC.1). */
export async function getAccountConsents(): Promise<AccountConsents> {
  const { token, devUserId } = await backendAuth();
  const { data, error, response } = await getAccountV1AccountGet({
    auth: token,
    headers: devUserId ? { "x-dev-user-id": devUserId } : undefined,
  });
  if (error || !data) throw toBackendError(error, response);
  return toAccountConsents(zGetAccountV1AccountGetResponse.parse(data)); // wire boundary
}

/**
 * Grant one consent purpose against the policy version the user was shown.
 * Returns the updated account, or `"stale_policy"` when the backend's 409 says the
 * shown version is no longer current (the caller re-reads and re-asks — WC.1).
 */
export async function grantConsent(
  purpose: ConsentPurpose,
  policyVersion: string,
): Promise<AccountConsents | "stale_policy"> {
  const { token, devUserId } = await backendAuth();
  const { data, error, response } = await grantConsentV1AccountConsentsPost({
    body: { purpose, policy_version: policyVersion },
    auth: token,
    headers: devUserId ? { "x-dev-user-id": devUserId } : undefined,
  });
  if (error || !data) {
    const backendError = toBackendError(error, response);
    if (backendError.status === 409) return "stale_policy";
    throw backendError;
  }
  return toAccountConsents(zGrantConsentV1AccountConsentsPostResponse.parse(data));
}
