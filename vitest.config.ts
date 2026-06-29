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
      // `include` makes v8 report ALL matching source files (untested → 0%), matching how
      // SonarCloud measures coverage (rather than only files imported by a test).
      include: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      exclude: [
        ...coverageConfigDefaults.exclude,
        // Not unit-testable (async RSC / route handlers / server-only) — covered by E2E.
        "**/page.tsx",
        "app/**/layout.tsx",
        "app/api/**",
        "lib/dal/**",
        "lib/data/**",
        "instrumentation.ts",
        "proxy.ts",
        // Generated + vendored + test infra.
        "lib/api/**",
        "components/ui/**",
        "lib/mocks/**",
        "lib/fixtures/**",
        "test/**",
        "**/*.config.*",
      ],
    },
  },
});
