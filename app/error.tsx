"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { reportError } from "@/lib/monitoring"

export default function Error({
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-medium">Something went wrong</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        The simulator hit an unexpected error. You can try again or reload the page.
      </p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
