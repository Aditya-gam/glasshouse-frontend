"use server";

import { z } from "zod";

import { CONSENT_POLICIES } from "@/lib/consent/policy";
import {
  eraseAccount,
  getAccount,
  grantConsent,
  requestExport,
  revokeConsent,
  setRetention,
} from "@/lib/dal/account";
import { BackendError } from "@/lib/dal/backend";
import { readRun } from "@/lib/dal/runs";
import { consentPurposeSchema, retentionSchema, type AccountInfo } from "@/lib/schemas/account";

/**
 * Server Actions for the Account screen (F3). Untrusted client input is validated
 * here; authentication happens inside the DAL on every call. Demo acknowledgements
 * happen ONLY on a documented 501 (route not implemented — pre-W1/W3/W4/W5);
 * a network failure against a live backend is an error, never a success.
 */

export type AccountActionResult =
  | { ok: true; live: boolean; account?: AccountInfo }
  | { ok: false; code: "stale_policy" | "error" };

function isStubEra(error: unknown): boolean {
  return error instanceof BackendError && error.status === 501;
}

const consentInputSchema = z.object({
  purpose: consentPurposeSchema,
  grant: z.boolean(),
  /** Required for grants (WC.1); ignored for revokes. */
  policyVersion: z.string().optional(),
});

export async function updateConsentAction(input: unknown): Promise<AccountActionResult> {
  const parsed = consentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "error" };
  const { purpose, grant, policyVersion } = parsed.data;

  try {
    if (grant) {
      // Trust-boundary re-check: never grant against text this build doesn't hold.
      if (!policyVersion || !(policyVersion in CONSENT_POLICIES)) {
        return { ok: false, code: "error" };
      }
      const result = await grantConsent(purpose, policyVersion);
      if (result === "stale_policy") return { ok: false, code: "stale_policy" };
      return { ok: true, live: true, account: result };
    }
    await revokeConsent(purpose);
  } catch (error) {
    if (isStubEra(error)) return { ok: true, live: false };
    return { ok: false, code: "error" };
  }
  // The revoke COMMITTED (204). A failed re-read must not be reported as "nothing
  // changed" — return success without the account and let the UI reflect the revoke.
  try {
    return { ok: true, live: true, account: await getAccount() };
  } catch {
    return { ok: true, live: true };
  }
}

const retentionInputSchema = z.object({ retention: retentionSchema });

export async function updateRetentionAction(input: unknown): Promise<AccountActionResult> {
  const parsed = retentionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "error" };
  try {
    return { ok: true, live: true, account: await setRetention(parsed.data.retention) };
  } catch (error) {
    if (isStubEra(error)) return { ok: true, live: false };
    return { ok: false, code: "error" };
  }
}

export type ExportActionResult =
  { ok: true; live: boolean; runId?: string } | { ok: false; code: "error" };

export async function requestExportAction(): Promise<ExportActionResult> {
  try {
    const { runId } = await requestExport();
    return { ok: true, live: true, runId };
  } catch (error) {
    if (isStubEra(error)) return { ok: true, live: false };
    return { ok: false, code: "error" };
  }
}

export type ExportStatusResult = { ok: true; status: string } | { ok: false };

/** Poll the export run (D2: exports are runs and reuse the existing polling). */
export async function exportRunStatusAction(input: unknown): Promise<ExportStatusResult> {
  const parsed = z.object({ runId: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false };
  try {
    const run = await readRun(parsed.data.runId);
    return { ok: true, status: run.status };
  } catch {
    return { ok: false };
  }
}

export type EraseActionResult = { ok: true; live: boolean } | { ok: false; code: "error" };

/**
 * D5 step 1: the backend's synchronous erasure (objects → rows → DEK cascade = the
 * crypto-shred). The CLIENT performs step 2 (Clerk identity deletion + sign-out) only
 * when this returns live:true — a demo acknowledgement must never remove a real
 * sign-in identity.
 */
export async function eraseAccountAction(): Promise<EraseActionResult> {
  try {
    await eraseAccount();
    return { ok: true, live: true };
  } catch (error) {
    if (isStubEra(error)) return { ok: true, live: false };
    return { ok: false, code: "error" };
  }
}
