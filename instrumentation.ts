export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const configured =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() ||
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim() ||
    process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT?.trim()
  if (!configured) return

  const { initTelemetry } = await import("./lib/telemetry")
  initTelemetry()
}
