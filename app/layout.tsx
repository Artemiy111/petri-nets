import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import MonitoringInit from '@/components/monitoring-init'
import WebVitals from '@/components/web-vitals'

// Monitoring config is read per request so one image works in every environment.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Timed petri nets',
  description: 'Timed petri nets',
}

function sampleRateFromEnv(value: string | undefined) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0
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
        <WebVitals />
      </body>
    </html>
  )
}
