import { registerOTel } from "@vercel/otel";

/**
 * Next.js calls this once per server runtime at startup.
 * Minimal OpenTelemetry registration for R2 — no exporter endpoint is wired yet;
 * collector/exporter config arrives with the infra work (M7). Keep this free of
 * secrets: any exporter credentials must come from the environment, never code.
 */
export function register(): void {
  registerOTel({ serviceName: "glasshouse-frontend" });
}
