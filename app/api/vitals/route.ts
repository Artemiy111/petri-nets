import type { NextRequest } from "next/server"

const METRICS = new Set(["CLS", "FCP", "INP", "LCP", "TTFB", "FID"])

// A beacon is a few hundred bytes; anything larger is noise or abuse.
const MAX_BODY_BYTES = 1024

/**
 * Web Vitals sink. Writes one structured JSON line per metric to stdout so the
 * data shows up in `docker compose logs` and can be shipped to Loki later.
 */
export async function POST(request: NextRequest) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 })
  }

  const metric = (await request.json().catch(() => null)) as Record<string, unknown> | null

  if (!metric || typeof metric.name !== "string" || !METRICS.has(metric.name)) {
    return new Response(null, { status: 400 })
  }

  console.log(
    JSON.stringify({
      level: "info",
      msg: "web-vital",
      ts: new Date().toISOString(),
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      path: metric.path,
    }),
  )

  return new Response(null, { status: 204 })
}
