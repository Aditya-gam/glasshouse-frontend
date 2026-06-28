import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { coverageConfigDefaults, defineConfig } from "vitest/config";

/**
 * Vitest config (M5.6). Per Next 16's guide: @vitejs/plugin-react + vite-tsconfig-paths
 * (so the `@/*` alias resolves) + jsdom. Async Server Components aren't supported by
 * Vitest — those (and cross-stack flows) are covered by Playwright E2E, not here.
 *
 * Default env is jsdom (component/integration); the server-only DAL tests opt into node
 * via a `// @vitest-environment node` pragma at the top of the file.
 */
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "e2e/**", "lib/api/**"],
    css: false,
    // lcov feeds SonarCloud (`pnpm test:coverage`). Exclude generated/config/infra code
    // so coverage reflects hand-written app code only.
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        ...coverageConfigDefaults.exclude,
        "lib/api/**",
        "lib/mocks/**",
        "lib/fixtures/**",
        "test/**",
        "**/*.config.*",
        "instrumentation.ts",
        "proxy.ts",
        "app/**/layout.tsx",
      ],
    },
  },
});
