"use client"

import { useCallback, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { getPortalSession, signOutPortal, type PortalSession } from "@/lib/portal/auth"
import { siteConfig } from "@/lib/site-config"

const NAV_LINKS = [
  { label: "Dashboard", href: "/portal" },
  { label: "Projects", href: "/portal/projects" },
  { label: "Invoices", href: "/portal/invoices" },
  { label: "Payments", href: "/portal/payments" },
]

const PUBLIC_PORTAL_PATHS = ["/portal/login"]

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<PortalSession | null>(null)
  const [ready, setReady] = useState(false)

  const isPublicPath = PUBLIC_PORTAL_PATHS.some((p) => pathname.startsWith(p))

  useEffect(() => {
    let active = true

    const init = async () => {
      const s = await getPortalSession()

      if (!active) return

      if (!s && !isPublicPath) {
        router.replace("/portal/login")
        return
      }

      setSession(s)
      setReady(true)
    }

    void init()

    return () => {
      active = false
    }
  }, [router, isPublicPath])

  const handleSignOut = useCallback(async () => {
    await signOutPortal()
    router.replace("/portal/login")
  }, [router])

  // Login page renders immediately without auth check
  if (isPublicPath) {
    return (
      <div className="min-h-screen">
        <div
          className="fixed top-0 left-0 z-[100] w-full px-4 pt-4 md:px-8"
          aria-label="Portal navigation"
        >
          <div className="saintce-nav mx-auto flex h-[68px] max-w-[1460px] items-center justify-center px-6">
            <span className="select-none font-display text-sm tracking-[0.32em] text-[var(--text-primary)]">
              {siteConfig.brand.name}
            </span>
          </div>
        </div>
        <div className="pt-[90px]">{children}</div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[var(--muted)]">Loading portal...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Portal Navbar */}
      <header className="fixed top-0 left-0 z-[100] w-full px-4 pt-4 md:px-8">
        <div className="saintce-nav mx-auto flex h-[68px] max-w-[1460px] items-center justify-between px-6 md:px-8">
          <div className="hidden items-center gap-6 text-sm text-[var(--muted-strong)] md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-[var(--text-primary)] ${pathname === link.href ? "text-[var(--text-primary)]" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 select-none font-display text-sm tracking-[0.32em] text-[var(--text-primary)]">
            {siteConfig.brand.name}
          </div>

          <div className="flex items-center gap-4">
            {session && (
              <span className="hidden text-xs text-[var(--muted)] md:block">
                {session.clientName}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="saintce-button saintce-button--ghost min-h-[36px] px-4 text-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="fixed bottom-0 left-0 z-[100] w-full border-t border-[var(--border-soft)] bg-[var(--bg-1)] px-2 py-2 md:hidden">
        <div className="grid grid-cols-4 gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center rounded-[16px] py-2 text-[0.62rem] uppercase tracking-[0.1em] transition-colors ${
                pathname === link.href
                  ? "bg-[var(--panel-subtle)] text-[var(--text-primary)]"
                  : "text-[var(--muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="pb-20 pt-[90px] md:pb-0">
        <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-8 md:py-12">
          {children}
        </div>
      </main>
    </div>
  )
}
