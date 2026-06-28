import { defineConfig } from "@hey-api/openapi-ts";

/**
 * Generates the typed backend client from the VENDORED spec (`openapi/openapi.json`),
 * which is pulled from the backend's published `openapi.json` via `pnpm spec:pull`.
 *
 * Output lands in `lib/api/` (generated — git-tracked but lint/format-ignored). The CI
 * drift-guard regenerates and fails on any diff, so the committed client can never drift
 * from the committed spec. `zod` emits boundary schemas the DAL validates responses with
 * (frontend.md: "Zod to parse/validate at the trust boundary").
 */
export default defineConfig({
  input: "./openapi/openapi.json",
  output: {
    path: "./lib/api",
  },
  plugins: ["@hey-api/client-fetch", "@hey-api/sdk", "zod"],
});
