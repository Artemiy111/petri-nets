import type { Tracer } from "@opentelemetry/api"

type BrowserTelemetryConfig = {
  sampleRate: number
  environment: string
  release?: string
}

type PerformanceEventTiming = PerformanceEntry & {
  duration: number
  processingStart?: number
}

const LONG_TASK_MS = 100
const SLOW_EVENT_MS = 100

let started = false

function endPageLoadSpan(tracer: Tracer) {
  const span = tracer.startSpan("document.load", {
    startTime: performance.timeOrigin,
  })
  let finished = false

  span.setAttribute("url.full", window.location.href)

  const finish = () => {
    if (finished) return
    finished = true

    const navigation = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined

    span.setAttribute("browser.navigation.type", navigation?.type ?? "navigate")

    if (navigation) {
      span.setAttribute("browser.ttfb_ms", navigation.responseStart - navigation.startTime)
      span.setAttribute(
        "browser.dom_content_loaded_ms",
        navigation.domContentLoadedEventEnd - navigation.startTime,
      )
      span.setAttribute("browser.load_ms", navigation.loadEventEnd - navigation.startTime)
      span.setAttribute("browser.transfer_size_bytes", navigation.transferSize)
    }

    span.end(performance.timeOrigin + performance.now())
  }

  if (document.readyState === "complete") {
    finish()
  } else {
    window.addEventListener("load", finish, { once: true })
  }
}

function observeLongTasks(tracer: Tracer) {
  if (!PerformanceObserver.supportedEntryTypes?.includes("longtask")) return

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.duration < LONG_TASK_MS) continue

      const start = performance.timeOrigin + entry.startTime
      const span = tracer.startSpan("browser.long_task", { startTime: start })
      span.setAttribute("browser.long_task.duration_ms", entry.duration)
      span.end(start + entry.duration)
    }
  })

  observer.observe({ type: "longtask", buffered: true })
}

function observeSlowEvents(tracer: Tracer) {
  if (!PerformanceObserver.supportedEntryTypes?.includes("event")) return

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries() as PerformanceEventTiming[]) {
      if (entry.duration < SLOW_EVENT_MS) continue

      const start = performance.timeOrigin + entry.startTime
      const span = tracer.startSpan("browser.event", { startTime: start })
      span.setAttribute("browser.event.type", entry.name)
      span.setAttribute("browser.event.duration_ms", entry.duration)
      span.end(start + entry.duration)
    }
  })

  observer.observe({
    type: "event",
    durationThreshold: SLOW_EVENT_MS,
    buffered: true,
  } as PerformanceObserverInit)
}

/**
 * Starts browser tracing and ships spans to the server-side OTLP relay. The
 * SDK is loaded lazily and only when sampling is enabled, so a deployment
 * without a collector pays nothing for it.
 */
export async function initBrowserTelemetry({
  sampleRate,
  environment,
  release,
}: BrowserTelemetryConfig) {
  if (started || sampleRate <= 0 || typeof window === "undefined") return
  started = true

  try {
    const [api, sdk, exporter, resources] = await Promise.all([
      import("@opentelemetry/api"),
      import("@opentelemetry/sdk-trace"),
      import("@opentelemetry/exporter-trace-otlp-http"),
      import("@opentelemetry/resources"),
    ])

    const contextManager = new sdk.StackContextManager()
    contextManager.enable()
    api.context.setGlobalContextManager(contextManager)

    const attributes: Record<string, string> = {
      "service.name": "petri-nets",
      "deployment.environment.name": environment,
      "browser.language": navigator.language,
    }
    if (release) attributes["service.version"] = release

    const provider = new sdk.TracerProvider({
      resource: resources.defaultResource().merge(resources.resourceFromAttributes(attributes)),
      sampler: new sdk.ParentBasedSampler({
        root: new sdk.TraceIdRatioBasedSampler(sampleRate),
      }),
      spanProcessors: [
        new sdk.BatchSpanProcessor({
          exporter: new exporter.OTLPTraceExporter({
            url: `${window.location.origin}/api/telemetry/v1/traces`,
          }),
        }),
      ],
    })

    api.trace.setGlobalTracerProvider(provider)
    const tracer = api.trace.getTracer("petri-nets")

    endPageLoadSpan(tracer)
    observeLongTasks(tracer)
    observeSlowEvents(tracer)
  } catch (error) {
    console.error("browser telemetry failed to start", error)
  }
}
