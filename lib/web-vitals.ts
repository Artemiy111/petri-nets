import { metrics, type Histogram } from "@opentelemetry/api"

const instruments = new Map<string, Histogram>()

const DURATION_METRICS = new Set(["FCP", "FID", "INP", "LCP", "TTFB"])

const DURATION_BUCKETS = [25, 50, 100, 200, 300, 500, 800, 1000, 1800, 2500, 3000, 4000, 8000]
const CLS_BUCKETS = [0.01, 0.05, 0.1, 0.25, 0.5, 1]

function instrumentFor(name: string) {
  const existing = instruments.get(name)
  if (existing) return existing

  const metric = metrics.getMeter("petri-nets").createHistogram(`web.vitals.${name.toLowerCase()}`, {
    unit: DURATION_METRICS.has(name) ? "ms" : "1",
    description: `Web Vital ${name} reported by the browser`,
    advice: {
      explicitBucketBoundaries: DURATION_METRICS.has(name) ? DURATION_BUCKETS : CLS_BUCKETS,
    },
  })
  instruments.set(name, metric)

  return metric
}

/**
 * Records a Web Vital as an OTLP histogram. Without a registered meter
 * provider the OpenTelemetry API drops the record, so this is always safe to call.
 */
export function recordWebVital(name: string, value: number, rating?: string) {
  instrumentFor(name).record(value, {
    "web.vital.name": name,
    "web.vital.rating": rating ?? "unknown",
  })
}
