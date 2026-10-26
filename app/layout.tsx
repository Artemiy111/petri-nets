import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import MonitoringInit from '@/components/monitoring-init'
import TelemetryInit from '@/components/telemetry-init'
import WebVitals from '@/components/web-vitals'

// Monitoring config is read per request so one image works in every environment.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Timed petri nets',
  description: 'Timed petri nets',
}

function sampleRateFromEnv(value: string | undefined, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const dsn = process.env.SENTRY_DSN?.trim() || undefined
  const environment =
    process.env.SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV || 'production'
  const release = process.env.SENTRY_RELEASE?.trim() || undefined
  const tracesSampleRate = sampleRateFromEnv(process.env.SENTRY_TRACES_SAMPLE_RATE)

  const otelEnvironment =
    process.env.OTEL_ENVIRONMENT?.trim() || process.env.NODE_ENV || 'production'
  const otelRelease = process.env.OTEL_SERVICE_VERSION?.trim() || release
  const otelConfigured =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim() ||
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim()
  const browserTelemetryRate = otelConfigured
    ? sampleRateFromEnv(
        process.env.OTEL_BROWSER_SAMPLE_RATE?.trim() || process.env.OTEL_TRACES_SAMPLE_RATE,
        1,
      )
    : 0

  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
        <MonitoringInit
          dsn={dsn}
          environment={environment}
          release={release}
          tracesSampleRate={tracesSampleRate}
        />
        <TelemetryInit
          sampleRate={browserTelemetryRate}
          environment={otelEnvironment}
          release={otelRelease}
        />
        <WebVitals />
      </body>
    </html>
  )
}
