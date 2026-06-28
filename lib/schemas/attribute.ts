import { z } from "zod";

/** Calibrated severity levels (per-attribute × per-persona, from the taxonomy). */
export const severityLevelSchema = z.enum(["low", "moderate", "high", "extreme"]);
export type SeverityLevel = z.infer<typeof severityLevelSchema>;

/** Severity as displayed — adds the first-class "abstain" (no-signal) state. */
export const displaySeveritySchema = z.enum(["low", "moderate", "high", "extreme", "abstain"]);
export type DisplaySeverity = z.infer<typeof displaySeveritySchema>;

/** The persona lens — Balanced is a safety-aware neutral default (persona-lens.md). */
export const lensSchema = z.enum(["balanced", "jobseeker", "atrisk"]);
export type Lens = z.infer<typeof lensSchema>;

/** The fixed PAI attribute taxonomy (8 attributes). */
export const attributeCodeSchema = z.enum([
  "location",
  "occupation",
  "sex",
  "age",
  "relationship",
  "education",
  "birthplace",
  "income",
]);
export type AttributeCode = z.infer<typeof attributeCodeSchema>;

/**
 * One inferred attribute. Reliability is the CALIBRATED point estimate (%) + interval
 * (`lo`/`hi`) — never the model's raw confidence. `abstain` marks a first-class
 * "no signal" attribute. Mirrors HANDOFF §3 / 06-api `AttributeRead`.
 */
export const attrItemSchema = z.object({
  code: attributeCodeSchema,
  label: z.string(),
  value: z.string().nullable(),
  detail: z.string().nullable(),
  reliability: z.number().min(0).max(100).optional(),
  lo: z.number().min(0).max(100).optional(),
  hi: z.number().min(0).max(100).optional(),
  evidence: z.string(),
  evidenceCount: z.number().int().nonnegative().optional(),
  abstain: z.boolean().optional(),
  sensitive: z.boolean().optional(),
  art9: z.boolean().optional(),
  sev: z.object({
    atrisk: severityLevelSchema,
    jobseeker: severityLevelSchema,
  }),
});
export type AttrItem = z.infer<typeof attrItemSchema>;

export const attrItemsSchema = z.array(attrItemSchema);
