import "server-only";

import { ATTRIBUTES } from "@/lib/fixtures/attributes";
import { attrItemsSchema, type AttrItem } from "@/lib/schemas/attribute";

/**
 * The audited subject's inferred attributes.
 *
 * M5.5: returns typed fixtures (parsed through the Zod boundary schema as a habit).
 * M5.4 swaps this implementation for the generated OpenAPI client + DAL (server-auth,
 * Zod-validated live data) — callers (Server Components) stay unchanged.
 */
export async function getAttributes(): Promise<AttrItem[]> {
  return attrItemsSchema.parse(ATTRIBUTES);
}
