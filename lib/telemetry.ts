import { context, metrics, trace } from "@opentelemetry/api"
import { AsyncLocalStorageContextManager } from "@opentelemetry/context-async-hooks"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { defaultResource, resourceFromAttributes } from "@opentelemetry/resources"
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics"
import {
  BatchSpanProcessor,
  ParentBasedSampler,
  TraceIdRatioBasedSampler,
  TracerProvider,
} from "@opentelemetry/sdk-trace"

let initialized = false

function sampleRateFromEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback
}

function endpointFromEnv(signal: "traces" | "metrics") {
  const specific = process.env[`OTEL_EXPORTER_OTLP_${signal.toUpperCase()}_ENDPOINT`]?.trim()
  if (specific) return specific

  const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim()
  return base ? `${base.replace(/\/+$/, "")}/v1/${signal}` : undefined
}

function resourceFor(environment: string, release: string | undefined) {
  const attributes: Record<string, string> = {
    "service.name": process.env.OTEL_SERVICE_NAME?.trim() || "petri-nets",
    "deployment.environment.name": environment,
  }
  if (release) attributes["service.version"] = release

  return defaultResource().merge(resourceFromAttributes(attributes))
}

/**
 * Starts OTLP/HTTP trace and metric pipelines for the Next.js server. Next.js
 * emits its own spans for requests and rendering once a global provider is set.
 *
 * The instrumentation hook only imports this module when an endpoint is
 * configured, so an unconfigured image never executes the SDK.
 */
export function initTelemetry() {
  if (initialized) return
  initialized = true

  const environment =
    process.env.OTEL_ENVIRONMENT?.trim() || process.env.NODE_ENV || "production"
  const release =
    process.env.OTEL_SERVICE_VERSION?.trim() || process.env.SENTRY_RELEASE?.trim() || undefined
  const resource = resourceFor(environment, release)

  const traceUrl = endpointFromEnv("traces")
  if (traceUrl) {
    const contextManager = new AsyncLocalStorageContextManager()
    contextManager.enable()
    context.setGlobalContextManager(contextManager)

    const rate = sampleRateFromEnv(process.env.OTEL_TRACES_SAMPLE_RATE, 1)
    const provider = new TracerProvider({
      resource,
      sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(rate) }),
      spanProcessors: [
        new BatchSpanProcessor({
          exporter: new OTLPTraceExporter({ url: traceUrl }),
        }),
      ],
    })
    trace.setGlobalTracerProvider(provider)
  }

  const metricUrl = endpointFromEnv("metrics")
  if (!metricUrl) return

  const reader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: metricUrl }),
    // Web Vitals arrive rarely; a shorter interval keeps local debugging responsive.
    exportIntervalMillis: 10_000,
  })
  metrics.setGlobalMeterProvider(new MeterProvider({ resource, readers: [reader] }))
}
