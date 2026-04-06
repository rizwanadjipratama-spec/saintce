"use client"

import { useEffect } from "react"

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[Saintce/Admin] Unhandled error:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.16em] text-(--signal)">Admin error</p>
      <h2 className="font-display text-4xl leading-none tracking-tight">Something went wrong</h2>
      <p className="max-w-sm text-sm text-(--muted)">{error.message || "An unexpected error occurred in the admin panel."}</p>
      {error.digest && <p className="font-mono text-xs text-(--muted)">ID: {error.digest}</p>}
      <button onClick={reset} className="saintce-button">Try again</button>
    </div>
  )
}
