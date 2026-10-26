import type { NextRequest } from "next/server"

// A browser batch is a few kilobytes; the limit stops the route from becoming
// an unbounded relay into the collector.
const MAX_BODY_BYTES = 256 * 1024

function collectorUrl() {
  const specific = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim()
  if (specific) return specific

  const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim()
  return base ? `${base.replace(/\/+$/, "")}/v1/traces` : undefined
}

/**
 * Same-origin OTLP/HTTP relay for browser spans. The collector is a ClusterIP
 * service, so the browser cannot reach it directly; the server forwards the
 * payload using its own service account-less network identity.
 */
export async function POST(request: NextRequest) {
  const target = collectorUrl()
  if (!target) return new Response(null, { status: 204 })

  const origin = request.headers.get("origin")
  const host = request.headers.get("host")

  if (origin && host) {
    let originHost: string
    try {
      originHost = new URL(origin).host
    } catch {
      return new Response(null, { status: 403 })
    }

    if (originHost !== host) return new Response(null, { status: 403 })
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return new Response(null, { status: 415 })
  }

  const body = await request.arrayBuffer()
  if (body.byteLength === 0 || body.byteLength > MAX_BODY_BYTES) {
    return new Response(null, { status: 413 })
  }

  try {
    const upstream = await fetch(target, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    return new Response(null, { status: upstream.ok ? 204 : 502 })
  } catch {
    return new Response(null, { status: 502 })
  }
}
