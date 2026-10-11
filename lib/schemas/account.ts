import { z } from "zod";

/** The wire purposes (write-paths D4). The UI never invents others. */
export const consentPurposeSchema = z.enum(["self_audit", "art9_inference", "decoy"]);
export type ConsentPurpose = z.infer<typeof consentPurposeSchema>;

export const retentionSchema = z.enum(["retain", "discard"]);
export type Retention = z.infer<typeof retentionSchema>;

export const consentStateSchema = z.object({
  granted: z.boolean(),
  /** ISO timestamp of the grant; absent when never granted. */
  grantedAt: z.string().optional(),
  /** The policy version the grant was made against; absent when never granted. */
  policyVersion: z.string().optional(),
});
export type ConsentState = z.infer<typeof consentStateSchema>;

export const connectedAccountSchema = z.object({
  id: z.uuid(),
  platform: z.string(),
  handle: z.string().optional(),
  status: z.string(),
});
export type ConnectedAccountInfo = z.infer<typeof connectedAccountSchema>;

/** The account as the UI consumes it — consent standing, retention, connections. */
export const accountSchema = z.object({
  selfAudit: consentStateSchema,
  art9: consentStateSchema,
  decoy: consentStateSchema,
  retention: retentionSchema,
  /** The consent-text version the backend currently requires grants against (WC.1). */
  currentPolicyVersion: z.string(),
  connectedAccounts: z.array(connectedAccountSchema),
});
export type AccountInfo = z.infer<typeof accountSchema>;
