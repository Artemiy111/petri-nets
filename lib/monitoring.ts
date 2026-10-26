import type * as SentryBrowser from "@sentry/browser"

type MonitoringConfig = {
  dsn: string
  environment: string
  release?: string
  tracesSampleRate: number
}

type PendingReport = {
  error: unknown
  context?: Record<string, unknown>
}

// The SDK is imported lazily so that a build without a DSN ships none of it.
let sentry: typeof SentryBrowser | null = null
const pendingReports: PendingReport[] = []

/**
 * Starts error reporting against a GlitchTip (Sentry-compatible) DSN.
 * Safe to call more than once and safe to call with an empty DSN.
 */
export async function initMonitoring({
  dsn,
  environment,
  release,
  tracesSampleRate,
}: MonitoringConfig) {
  if (!dsn || sentry) return

  const Sentry = await import("@sentry/browser")

  Sentry.init({
    dsn,
    environment,
    release: release || undefined,
    tracesSampleRate,
    // Pageload transactions carry the Web Vitals measurements, so only pay for them when asked.
    integrations: tracesSampleRate > 0 ? [Sentry.browserTracingIntegration()] : [],
    // The simulator has no accounts and no cookies; keep events free of both.
    dataCollection: { userInfo: false, cookies: false },
    ignoreErrors: [
      // Fired constantly by React Flow's ResizeObserver usage; not actionable.
      /ResizeObserver loop/i,
      /^Non-Error promise rejection captured/i,
    ],
  })

  sentry = Sentry

  // Flush anything that happened before the SDK finished loading.
  pendingReports.splice(0).forEach(({ error, context }) => reportError(error, context))
}

/**
 * Reports an error to GlitchTip. Falls back to the console when monitoring is off,
 * so local development and DSN-less deployments keep their current behaviour.
 */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (!sentry) {
    // Keep early errors around until the lazy import resolves.
    if (pendingReports.length < 10) pendingReports.push({ error, context })
    console.error(error)
    return
  }

  sentry.captureException(error, context ? { extra: context } : undefined)
}
