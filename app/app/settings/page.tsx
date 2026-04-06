"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getPortalSession, signOutPortal, type PortalSession } from "@/lib/portal/auth"
import { siteConfig } from "@/lib/site-config"

export default function AppSettingsPage() {
  const router = useRouter()
  const [session, setSession] = useState<PortalSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    let active = true
    const init = async () => {
      const s = await getPortalSession()
      if (!s) { router.replace("/login"); return }
      if (active) { setSession(s); setLoading(false) }
    }
    void init()
    return () => { active = false }
  }, [router])

  const handleSignOut = useCallback(async () => {
    setSigningOut(true)
    await signOutPortal()
    router.replace("/login")
  }, [router])

  if (loading || !session) return <div className="text-(--muted)">Loading...</div>

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Settings</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,4vw,3.6rem)] leading-none tracking-[-0.04em]">
          Account settings
        </h1>
      </div>

      <div className="grid gap-5 max-w-[640px]">
        {/* Profile */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="mb-5 font-display text-xl">Profile</h2>
          <div className="grid gap-4">
            <div className="saintce-inset rounded-[18px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-(--muted)">Name</p>
              <p className="mt-2 text-(--text-primary)">{session.clientName}</p>
            </div>
            <div className="saintce-inset rounded-[18px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-(--muted)">Email</p>
              <p className="mt-2 text-(--text-primary)">{session.email}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-(--muted)">
            To update your name or email, contact us at{" "}
            <a href={`mailto:${siteConfig.contact.email}`} className="underline hover:text-(--text-primary)">
              {siteConfig.contact.email}
            </a>
            .
          </p>
        </section>

        {/* Security */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="mb-2 font-display text-xl">Security</h2>
          <p className="mb-5 text-sm text-(--muted)">
            You sign in via a secure magic link sent to your email. No passwords to manage.
          </p>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="saintce-button saintce-button--ghost"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </section>

        {/* Support */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="mb-2 font-display text-xl">Need help?</h2>
          <p className="mb-5 text-sm text-(--muted)">
            Open a support ticket and our team will get back to you promptly.
          </p>
          <a href="/app/tickets" className="saintce-button">
            Open a ticket
          </a>
        </section>
      </div>
    </div>
  )
}
