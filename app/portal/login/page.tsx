"use client"

import { useCallback, useState } from "react"
import { sendPortalMagicLink } from "@/lib/portal/auth"
import { siteConfig } from "@/lib/site-config"

export default function PortalLoginPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      const trimmed = email.trim()
      if (!trimmed) {
        setError("Email is required.")
        return
      }

      setLoading(true)

      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const err = await sendPortalMagicLink(trimmed, `${origin}/portal`)

      setLoading(false)

      if (err) {
        setError(err)
        return
      }

      setSent(true)
    },
    [email]
  )

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="saintce-panel p-8">
          <div className="mb-8">
            <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">
              Client Portal
            </p>
            <h1 className="mt-4 font-display text-[2.4rem] leading-none tracking-[-0.04em]">
              {siteConfig.brand.name}
            </h1>
            <p className="mt-3 text-[0.95rem] leading-[1.7] text-(--muted)">
              Enter your registered email to receive a secure login link.
            </p>
          </div>

          {sent ? (
            <div className="saintce-inset rounded-[22px] p-5">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-(--signal)">
                Link sent
              </p>
              <p className="mt-3 text-[0.95rem] leading-[1.7] text-(--text-primary)">
                Check your inbox at <strong>{email}</strong>. Click the link to sign in.
              </p>
              <p className="mt-2 text-sm text-(--muted)">
                The link expires in 60 minutes. If you don&apos;t see it, check your spam folder.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="portal-email"
                    className="mb-2 block font-mono text-[0.72rem] uppercase tracking-[0.16em] text-(--muted)"
                  >
                    Email address
                  </label>
                  <input
                    id="portal-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    required
                    disabled={loading}
                    className="saintce-input"
                  />
                </div>

                {error && (
                  <p className="text-sm text-(--signal)">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="saintce-button w-full"
                >
                  {loading ? "Sending..." : "Send login link"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-(--muted)">
          Only registered clients can sign in. Contact{" "}
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="text-(--muted-strong) underline transition-colors hover:text-(--text-primary)"
          >
            {siteConfig.contact.email}
          </a>{" "}
          if you need access.
        </p>
      </div>
    </div>
  )
}
