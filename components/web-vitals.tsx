"use client"

import { useReportWebVitals } from "next/web-vitals"

export default function WebVitals() {
  useReportWebVitals((metric) => {
    const payload = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      path: window.location.pathname,
    })

    // sendBeacon survives page unload, which matters for CLS and INP.
    if (typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" })
      if (navigator.sendBeacon("/api/vitals", blob)) return
    }

    void fetch("/api/vitals", {
      method: "POST",
      body: payload,
      headers: { "content-type": "application/json" },
      keepalive: true,
    }).catch(() => {})
  })

  return null
}
