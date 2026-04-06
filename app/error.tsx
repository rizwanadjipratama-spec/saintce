"use client"

import { useEffect } from "react"

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to console in dev; replace with Sentry.captureException(error) in production
    console.error("[Saintce] Unhandled error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Error</p>
      <h1 className="font-display text-[clamp(2rem,5vw,4rem)] leading-none tracking-[-0.04em]">
        Something went wrong
      </h1>
      <p className="max-w-md text-(--muted)">
        An unexpected error occurred. Our team has been notified. You can try again or return to the home page.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-(--muted)">ID: {error.digest}</p>
      )}
      <div className="flex gap-4">
        <button onClick={reset} className="saintce-button">
          Try again
        </button>
        <a href="/" className="saintce-button saintce-button--ghost">
          Home
        </a>
      </div>
    </div>
  )
}
