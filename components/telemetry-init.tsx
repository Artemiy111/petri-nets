"use client"

import { useEffect } from "react"
import { initBrowserTelemetry } from "@/lib/browser-telemetry"

type TelemetryInitProps = {
  sampleRate: number
  environment: string
  release?: string
}

export default function TelemetryInit({ sampleRate, environment, release }: TelemetryInitProps) {
  useEffect(() => {
    void initBrowserTelemetry({ sampleRate, environment, release })
  }, [sampleRate, environment, release])

  return null
}
