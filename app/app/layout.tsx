"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { getPortalSession, signOutPortal, type PortalSession } from "@/lib/portal/auth"
import { siteConfig } from "@/lib/site-config"

const NAV_LINKS = [
  { label: "Dashboard", href: "/app" },
  { label: "Projects", href: "/app/projects" },
  { label: "Subscriptions", href: "/app/subscriptions" },
  { label: "Invoices", href: "/app/invoices" },
  { label: "Payments", href: "/app/payments" },
  { label: "Files", href: "/app/files" },
  { label: "Support", href: "/app/tickets" },
  { label: "Settings", href: "/app/settings" },
]

const MOBILE_NAV_LINKS = NAV_LINKS.slice(0, 5)

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [session, setSession] = useState<PortalSession | null>(null)
  const [ready, setReady] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    const init = async () => {
      const s = await getPortalSession()
      if (!active) return
      if (!s) { router.replace("/login"); return }
      setSession(s)
      setReady(true)
    }
    void init()
    return () => { active = false }
  }, [router])

  // Close avatar dropdown on outside click
  useEffect(() => {
    if (!avatarOpen) return
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [avatarOpen])

  const handleSignOut = useCallback(async () => {
    await signOutPortal()
    router.replace("/login")
  }, [router])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-(--muted)">Loading...</p>
      </div>
    )
  }

  const initials = session?.clientName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() ?? "?"

  return (
    <div className="flex min-h-screen">
      {/* ── Sidebar (desktop) ── */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r border-(--border-soft) bg-(--bg-1) md:flex">
        {/* Brand */}
        <div className="flex h-17 shrink-0 items-center border-b border-(--border-soft) px-6">
          <Link
            href="/app"
            className="select-none font-display text-sm tracking-[0.32em] text-(--text-primary)"
          >
            {siteConfig.brand.name}
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(link.href)
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={`flex items-center rounded-[14px] px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? "bg-(--panel-subtle) text-(--text-primary)"
                        : "text-(--muted-strong) hover:bg-(--panel-subtle) hover:text-(--text-primary)"
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-(--signal)" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Avatar / user section */}
        <div className="shrink-0 border-t border-(--border-soft) p-3" ref={avatarRef}>
          <button
            onClick={() => setAvatarOpen((p) => !p)}
            className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm transition-colors hover:bg-(--panel-subtle)"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--signal) font-mono text-xs text-(--bg-1)">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-(--text-primary)">{session?.clientName}</p>
              <p className="truncate text-xs text-(--muted)">{session?.email}</p>
            </div>
            <svg className={`h-4 w-4 shrink-0 text-(--muted) transition-transform ${avatarOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {avatarOpen && (
            <div className="mt-1 overflow-hidden rounded-[14px] border border-(--border-soft) bg-(--bg-2)">
              <Link
                href="/app/settings"
                onClick={() => setAvatarOpen(false)}
                className="block px-4 py-2.5 text-sm text-(--muted-strong) transition-colors hover:bg-(--panel-subtle) hover:text-(--text-primary)"
              >
                Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2.5 text-left text-sm text-(--signal) transition-colors hover:bg-(--panel-subtle)"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <header className="fixed top-0 left-0 z-50 flex h-14 w-full items-center justify-between border-b border-(--border-soft) bg-(--bg-1) px-4 md:hidden">
        <Link href="/app" className="select-none font-display text-sm tracking-[0.32em] text-(--text-primary)">
          {siteConfig.brand.name}
        </Link>
        <button
          onClick={() => setMobileOpen((p) => !p)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="rounded-xl p-2 text-(--muted-strong)"
        >
          {mobileOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <nav className="absolute top-14 left-0 right-0 border-b border-(--border-soft) bg-(--bg-1) px-3 pb-4 pt-2">
            <ul className="space-y-0.5">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/app"
                    ? pathname === "/app"
                    : pathname.startsWith(link.href)
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center rounded-[14px] px-3 py-3 text-sm ${
                        isActive
                          ? "bg-(--panel-subtle) text-(--text-primary)"
                          : "text-(--muted-strong)"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
            <div className="mt-3 border-t border-(--border-soft) pt-3">
              <div className="flex items-center gap-3 px-3 pb-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--signal) font-mono text-xs text-(--bg-1)">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm text-(--text-primary)">{session?.clientName}</p>
                  <p className="truncate text-xs text-(--muted)">{session?.email}</p>
                </div>
              </div>
              <button
                onClick={async () => {
                  setMobileOpen(false)
                  await handleSignOut()
                }}
                className="w-full rounded-[14px] px-3 py-2.5 text-left text-sm text-(--signal)"
              >
                Sign out
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 left-0 z-40 w-full border-t border-(--border-soft) bg-(--bg-1) px-2 py-2 md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {MOBILE_NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex flex-col items-center rounded-2xl py-2 text-[0.62rem] uppercase tracking-widest transition-colors ${
                  isActive
                    ? "bg-(--panel-subtle) text-(--text-primary)"
                    : "text-(--muted) hover:text-(--text-primary)"
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* ── Main content ── */}
      <main className="flex-1 pb-20 pt-14 md:ml-64 md:pb-0 md:pt-0">
        <div className="mx-auto max-w-350 px-4 py-8 md:px-8 md:py-12">
          {children}
        </div>
      </main>
    </div>
  )
}
