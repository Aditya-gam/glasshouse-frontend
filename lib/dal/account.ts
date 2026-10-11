import "server-only";

import {
  eraseAccountV1AccountDelete,
  exportAccountV1AccountExportPost,
  getAccountV1AccountGet,
  grantConsentV1AccountConsentsPost,
  revokeConsentV1AccountConsentsPurposeDelete,
  setRetentionV1AccountRetentionPut,
} from "@/lib/api";
import type { AccountRead, ConsentState as WireConsentState } from "@/lib/api";
import {
  zExportAccountV1AccountExportPostResponse,
  zGetAccountV1AccountGetResponse,
  zGrantConsentV1AccountConsentsPostResponse,
  zSetRetentionV1AccountRetentionPutResponse,
} from "@/lib/api/zod.gen";
import {
  accountSchema,
  type AccountInfo,
  type ConsentPurpose,
  type Retention,
} from "@/lib/schemas/account";

import { backendAuth, toBackendError, type BackendAuth } from "./backend";

/**
 * Account DAL — consent standing, grants/revokes, retention, export, erasure
 * (write-paths D4/D5/WC.1).
 */

function toConsentState(wire: WireConsentState): unknown {
  return {
    granted: wire.granted,
    ...(wire.granted_at != null ? { grantedAt: wire.granted_at } : {}),
    ...(wire.policy_version != null ? { policyVersion: wire.policy_version } : {}),
  };
}

function toAccountInfo(read: AccountRead): AccountInfo {
  return accountSchema.parse({
    selfAudit: toConsentState(read.consents.self_audit),
    art9: toConsentState(read.consents.art9_inference),
    decoy: toConsentState(read.consents.decoy),
    retention: read.retention,
    currentPolicyVersion: read.current_policy_version,
    connectedAccounts: read.connected_accounts.map((account) => ({
      id: account.id,
      platform: account.platform,
      ...(account.handle != null ? { handle: account.handle } : {}),
      status: account.status,
    })),
  }); // UI boundary
}

function toAuthOptions({ token, devUserId }: BackendAuth) {
  return {
    auth: token,
    headers: devUserId ? { "x-dev-user-id": devUserId } : undefined,
  };
}

/** The caller's account standing + the policy version grants must cite (WC.1). */
export async function getAccount(): Promise<AccountInfo> {
  const { data, error, response } = await getAccountV1AccountGet(
    toAuthOptions(await backendAuth()),
  );
  if (error || !data) throw toBackendError(error, response);
  return toAccountInfo(zGetAccountV1AccountGetResponse.parse(data)); // wire boundary
}

/**
 * Grant one consent purpose against the policy version the user was shown.
 * Returns the updated account, or `"stale_policy"` when the backend's 409 says the
 * shown version is no longer current (the caller re-reads and re-asks — WC.1).
 */
export async function grantConsent(
  purpose: ConsentPurpose,
  policyVersion: string,
): Promise<AccountInfo | "stale_policy"> {
  const { data, error, response } = await grantConsentV1AccountConsentsPost({
    body: { purpose, policy_version: policyVersion },
    ...toAuthOptions(await backendAuth()),
  });
  if (error || !data) {
    const backendError = toBackendError(error, response);
    if (backendError.status === 409) return "stale_policy";
    throw backendError;
  }
  return toAccountInfo(zGrantConsentV1AccountConsentsPostResponse.parse(data));
}

/** Revoke one purpose (D4: stops processing, deletes nothing). 204 on success. */
export async function revokeConsent(purpose: ConsentPurpose): Promise<void> {
  const { error, response } = await revokeConsentV1AccountConsentsPurposeDelete({
    path: { purpose },
    ...toAuthOptions(await backendAuth()),
  });
  if (error) throw toBackendError(error, response);
}

/** Set the retention mode (D8). Returns the updated account. */
export async function setRetention(retention: Retention): Promise<AccountInfo> {
  const { data, error, response } = await setRetentionV1AccountRetentionPut({
    body: { retention },
    ...toAuthOptions(await backendAuth()),
  });
  if (error || !data) throw toBackendError(error, response);
  return toAccountInfo(zSetRetentionV1AccountRetentionPutResponse.parse(data));
}

/** Request the DSAR export bundle — an `export` run (D2). Returns the run handle. */
export async function requestExport(): Promise<{ runId: string }> {
  const { data, error, response } = await exportAccountV1AccountExportPost(
    toAuthOptions(await backendAuth()),
  );
  if (error || !data) throw toBackendError(error, response);
  const read = zExportAccountV1AccountExportPostResponse.parse(data);
  return { runId: read.run_id };
}

/**
 * Synchronous erasure (D5): the backend deletes objects, then the user row — the
 * cascade is the crypto-shred. 204 on success; the CALLER then removes the Clerk
 * identity client-side and signs out.
 */
export async function eraseAccount(): Promise<void> {
  const { error, response } = await eraseAccountV1AccountDelete(toAuthOptions(await backendAuth()));
  if (error) throw toBackendError(error, response);
}
