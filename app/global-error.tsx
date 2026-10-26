"use client"

import { useEffect } from "react"
import "./globals.css"
import { reportError } from "@/lib/monitoring"

// Replaces the root layout when it fails, so it has to render its own document.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    reportError(error, { digest: error.digest })
  }, [error])

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h2 className="text-lg font-medium">Something went wrong</h2>
        <button className="rounded-md border px-4 py-2 text-sm" onClick={reset}>
          Try again
        </button>
      </body>
    </html>
  )
}
