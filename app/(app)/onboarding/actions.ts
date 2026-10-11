"use server";

import { z } from "zod";

import { CONSENT_POLICIES } from "@/lib/consent/policy";
import { grantConsent } from "@/lib/dal/account";
import { BackendError } from "@/lib/dal/backend";

/**
 * Server Action for the consent step (F1). Client input is untrusted and validated
 * here; authentication happens inside the DAL on every call (never assumed from the
 * page). `self_audit` is the required purpose; `art9_inference` is granted only when
 * the user made that separate, optional choice.
 */

const grantInputSchema = z.object({
  policyVersion: z.string().min(1),
  art9: z.boolean(),
});

export type GrantConsentsResult =
  | {
      ok: true;
      /** False = the stub-era demo acknowledgement (route 501) — nothing was stored. */
      live: boolean;
      /** The backend-recorded grant time (live only). */
      grantedAt?: string;
      /** Whether Art. 9 consent is RECORDED (from the returned account, not the request). */
      art9Granted: boolean;
      /** Set when the required grant succeeded but the optional Art. 9 grant failed. */
      art9Error?: boolean;
    }
  /** The shown policy text is no longer current — re-read and re-ask (WC.1 409). */
  | { ok: false; code: "stale_policy" }
  | { ok: false; code: "error" };

/**
 * Only a documented 501 (route not implemented yet — pre-W1) is the demo path.
 * A network failure against a live backend must NEVER be reported as recorded.
 */
function isStubEra(error: unknown): boolean {
  return error instanceof BackendError && error.status === 501;
}

export async function grantConsents(input: unknown): Promise<GrantConsentsResult> {
  const parsed = grantInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "error" };
  const { policyVersion, art9 } = parsed.data;
  // Trust-boundary re-check of the component's rule: never grant against text this
  // build doesn't hold — a forged request can't bypass the WC.1 guarantee.
  if (!(policyVersion in CONSENT_POLICIES)) return { ok: false, code: "error" };

  let account;
  try {
    const selfAudit = await grantConsent("self_audit", policyVersion);
    if (selfAudit === "stale_policy") return { ok: false, code: "stale_policy" };
    account = selfAudit;
  } catch (error) {
    if (isStubEra(error)) return { ok: true, live: false, art9Granted: art9 };
    return { ok: false, code: "error" };
  }

  if (art9) {
    try {
      const art9Grant = await grantConsent("art9_inference", policyVersion);
      // The version was current a moment ago; a race to a new version re-asks.
      if (art9Grant === "stale_policy") return { ok: false, code: "stale_policy" };
      account = art9Grant;
    } catch {
      // The required grant stands; the optional one failed — report it, never fake it.
      return {
        ok: true,
        live: true,
        grantedAt: account.selfAudit.grantedAt,
        art9Granted: account.art9.granted,
        art9Error: true,
      };
    }
  }

  return {
    ok: true,
    live: true,
    grantedAt: account.selfAudit.grantedAt,
    art9Granted: account.art9.granted,
  };
}
