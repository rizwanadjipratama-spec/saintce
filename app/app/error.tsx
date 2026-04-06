"use client"

import { useEffect } from "react"

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Saintce/App] Unhandled error:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-(--signal)">App error</p>
      <h2 className="font-display text-4xl leading-none tracking-tight">Something went wrong</h2>
      <p className="max-w-sm text-sm text-(--muted)">{error.message || "An unexpected error occurred. Please try again."}</p>
      {error.digest && <p className="font-mono text-xs text-(--muted)">ID: {error.digest}</p>}
      <div className="flex gap-4">
        <button onClick={reset} className="saintce-button">Try again</button>
        <a href="/app" className="saintce-button saintce-button--ghost">Dashboard</a>
      </div>
    </div>
  )
}
