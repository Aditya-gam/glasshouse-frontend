import { z } from "zod";

/** The wire purposes (write-paths D4). The UI never invents others. */
export const consentPurposeSchema = z.enum(["self_audit", "art9_inference", "decoy"]);
export type ConsentPurpose = z.infer<typeof consentPurposeSchema>;

export const consentStateSchema = z.object({
  granted: z.boolean(),
  /** ISO timestamp of the grant; absent when never granted. */
  grantedAt: z.string().optional(),
  /** The policy version the grant was made against; absent when never granted. */
  policyVersion: z.string().optional(),
});
export type ConsentState = z.infer<typeof consentStateSchema>;

/**
 * The account's consent standing — the minimal DTO F1 needs (mirrors `AccountRead`
 * minus connected accounts, which the Account screen adds in F3).
 */
export const accountConsentsSchema = z.object({
  selfAudit: consentStateSchema,
  art9: consentStateSchema,
  decoy: consentStateSchema,
  retention: z.enum(["retain", "discard"]),
  /** The consent-text version the backend currently requires grants against (WC.1). */
  currentPolicyVersion: z.string(),
});
export type AccountConsents = z.infer<typeof accountConsentsSchema>;
