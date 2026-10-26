"use client"

import { useEffect } from "react"
import { initMonitoring } from "@/lib/monitoring"

type MonitoringInitProps = {
  dsn?: string
  environment: string
  release?: string
  tracesSampleRate: number
}

export default function MonitoringInit({
  dsn,
  environment,
  release,
  tracesSampleRate,
}: MonitoringInitProps) {
  useEffect(() => {
    if (!dsn) return
    void initMonitoring({ dsn, environment, release, tracesSampleRate })
  }, [dsn, environment, release, tracesSampleRate])

  return null
}
