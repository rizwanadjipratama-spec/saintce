"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ANIMATION } from "@/lib/animation"
import { siteConfig } from "@/lib/site-config"
import { supabase } from "@/lib/supabase"

interface AuthState {
  ready: boolean
  isAuthenticated: boolean
  email: string
  initials: string
  dashboardHref: string
}

function getInitials(email: string): string {
  const value = email.trim()
  if (!value) return "U"
  return value[0]?.toUpperCase() || "U"
}

async function resolveDashboardHref(userId: string, email: string): Promise<string> {
  const [adminResult, clientResult] = await Promise.all([
    supabase
      .from("admin_users")
      .select("id")
      .or(`user_id.eq.${userId},email.ilike.${email}`)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("clients")
      .select("id")
      .ilike("email", email)
      .maybeSingle(),
  ])

  const isAdmin = Boolean(adminResult.data) || email === siteConfig.contact.adminEmail
  if (isAdmin) return "/admin"
  if (clientResult.data) return "/app"

  return "/app"
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const isRouteMode = pathname === "/contact" || pathname === "/clients"
  const [menuOpen, setMenuOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const desktopAvatarRef = useRef<HTMLDivElement>(null)
  const mobileAvatarRef = useRef<HTMLDivElement>(null)

  const [auth, setAuth] = useState<AuthState>({
    ready: false,
    isAuthenticated: false,
    email: "",
    initials: "U",
    dashboardHref: "/app",
  })

  useEffect(() => {
    let active = true

    const applyUserState = async () => {
      const { data, error } = await supabase.auth.getUser()
      if (!active) return

      if (error || !data.user?.email) {
        setAuth({
          ready: true,
          isAuthenticated: false,
          email: "",
          initials: "U",
          dashboardHref: "/app",
        })
        return
      }

      const email = data.user.email
      const dashboardHref = await resolveDashboardHref(data.user.id, email)
      if (!active) return

      setAuth({
        ready: true,
        isAuthenticated: true,
        email,
        initials: getInitials(email),
        dashboardHref,
      })
    }

    void applyUserState()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user

      if (!user?.email) {
        setAuth({
          ready: true,
          isAuthenticated: false,
          email: "",
          initials: "U",
          dashboardHref: "/app",
        })
        return
      }

      void (async () => {
        const dashboardHref = await resolveDashboardHref(user.id, user.email ?? "")
        if (!active) return

        setAuth({
          ready: true,
          isAuthenticated: true,
          email: user.email ?? "",
          initials: getInitials(user.email ?? ""),
          dashboardHref,
        })
      })()
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!avatarOpen) return

    const onOutsideClick = (event: MouseEvent) => {
      const desktopContains = desktopAvatarRef.current?.contains(event.target as Node)
      const mobileContains = mobileAvatarRef.current?.contains(event.target as Node)
      if (!desktopContains && !mobileContains) {
        setAvatarOpen(false)
      }
    }

    document.addEventListener("mousedown", onOutsideClick)
    return () => document.removeEventListener("mousedown", onOutsideClick)
  }, [avatarOpen])

  useEffect(() => {
    if (!menuOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [menuOpen])

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back()
      return
    }
    router.push("/")
  }, [router])

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev)
  }, [])

  const closeMenu = useCallback(() => {
    setMenuOpen(false)
  }, [])

  const toggleAvatar = useCallback(() => {
    setAvatarOpen((prev) => !prev)
  }, [])

  const handleSignOut = useCallback(async () => {
    try {
      setSigningOut(true)
      await supabase.auth.signOut()
      setAvatarOpen(false)
      setMenuOpen(false)
      router.push("/")
    } finally {
      setSigningOut(false)
    }
  }, [router])

  const itemLinks = useMemo(
    () => [{ label: "Dashboard", href: auth.isAuthenticated ? auth.dashboardHref : "/login" }, ...siteConfig.navigation],
    [auth.dashboardHref, auth.isAuthenticated]
  )

  const shouldShowClose = isRouteMode || menuOpen
  const handleMobileIconClick = isRouteMode ? handleBack : toggleMenu
  const iconTransition = { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }

  return (
    <header className="fixed top-0 left-0 z-100 w-full px-4 pt-4 md:px-8">
      <div className="saintce-nav mx-auto flex h-19.5 max-w-365 items-center justify-between px-6 md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden items-center text-sm text-(--muted-strong) md:flex">
            <AnimatePresence mode="wait">
              {isRouteMode ? (
                <motion.button
                  key="back"
                  onClick={handleBack}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: ANIMATION.durationMedium, ease: ANIMATION.easing }}
                  className="transition-colors hover:text-(--text-primary)"
                >
                  Home
                </motion.button>
              ) : (
                <motion.nav
                  key="menu"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: ANIMATION.durationMedium, ease: ANIMATION.easing }}
                  className="flex gap-8"
                >
                  {itemLinks.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="transition-colors hover:text-(--text-primary)"
                    >
                      {item.label}
                    </Link>
                  ))}
                </motion.nav>
              )}
            </AnimatePresence>
          </div>

          {auth.ready && !auth.isAuthenticated && (
            <Link
              href="/contact"
              className="saintce-button min-h-9.5 px-5 text-sm md:hidden"
            >
              Sign Up
            </Link>
          )}

          {auth.ready && auth.isAuthenticated && (
            <div className="relative md:hidden" ref={mobileAvatarRef}>
              <button
                onClick={toggleAvatar}
                className="flex h-9.5 w-9.5 items-center justify-center rounded-full bg-(--signal) font-mono text-xs text-(--bg-1)"
                aria-label={avatarOpen ? "Close user menu" : "Open user menu"}
              >
                {auth.initials}
              </button>

              <AnimatePresence>
                {avatarOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: ANIMATION.durationFast, ease: ANIMATION.easing }}
                    className="absolute top-12 left-0 z-200 w-52 overflow-hidden rounded-[16px] border border-(--border-soft) bg-(--bg-2)"
                  >
                    <p className="truncate border-b border-(--border-soft) px-4 py-2 text-xs text-(--muted)">
                      {auth.email}
                    </p>
                    <Link
                      href={auth.dashboardHref}
                      onClick={() => setAvatarOpen(false)}
                      className="block px-4 py-2.5 text-sm text-(--muted-strong) transition-colors hover:bg-(--panel-subtle) hover:text-(--text-primary)"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="w-full px-4 py-2.5 text-left text-sm text-(--signal) transition-colors hover:bg-(--panel-subtle) disabled:opacity-70"
                    >
                      {signingOut ? "Signing out..." : "Sign out"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 select-none font-display text-sm tracking-[0.32em] text-(--text-primary)">
          {siteConfig.brand.name}
        </div>

        <div className="flex items-center gap-3">
          {auth.ready && !auth.isAuthenticated && !isRouteMode && (
            <Link
              href="/contact"
              className="hidden saintce-button min-h-9.5 px-5 text-sm md:inline-flex"
            >
              Sign Up
            </Link>
          )}

          {auth.ready && auth.isAuthenticated && (
            <div className="relative hidden md:block" ref={desktopAvatarRef}>
              <button
                onClick={toggleAvatar}
                className="flex h-9.5 w-9.5 items-center justify-center rounded-full bg-(--signal) font-mono text-xs text-(--bg-1)"
                aria-label={avatarOpen ? "Close user menu" : "Open user menu"}
              >
                {auth.initials}
              </button>

              <AnimatePresence>
                {avatarOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: ANIMATION.durationFast, ease: ANIMATION.easing }}
                    className="absolute top-12 right-0 z-200 w-56 overflow-hidden rounded-[16px] border border-(--border-soft) bg-(--bg-2)"
                  >
                    <p className="truncate border-b border-(--border-soft) px-4 py-2 text-xs text-(--muted)">
                      {auth.email}
                    </p>
                    <Link
                      href={auth.dashboardHref}
                      onClick={() => setAvatarOpen(false)}
                      className="block px-4 py-2.5 text-sm text-(--muted-strong) transition-colors hover:bg-(--panel-subtle) hover:text-(--text-primary)"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="w-full px-4 py-2.5 text-left text-sm text-(--signal) transition-colors hover:bg-(--panel-subtle) disabled:opacity-70"
                    >
                      {signingOut ? "Signing out..." : "Sign out"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={handleMobileIconClick}
            className="z-200 text-xl text-(--text-primary) md:hidden"
            aria-label={shouldShowClose ? "Close menu" : "Open menu"}
          >
            <motion.svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <motion.line
                x1="4" y1="7" x2="20" y2="7"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                style={{ transformOrigin: "50% 50%", willChange: "transform, opacity" }}
                animate={shouldShowClose ? { y: 5, rotate: 45 } : { y: 0, rotate: 0 }}
                transition={iconTransition}
              />
              <motion.line
                x1="4" y1="12" x2="20" y2="12"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                style={{ transformOrigin: "50% 50%", willChange: "transform, opacity" }}
                animate={shouldShowClose ? { opacity: 0 } : { opacity: 1 }}
                transition={iconTransition}
              />
              <motion.line
                x1="4" y1="17" x2="20" y2="17"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                style={{ transformOrigin: "50% 50%", willChange: "transform, opacity" }}
                animate={shouldShowClose ? { y: -5, rotate: -45 } : { y: 0, rotate: 0 }}
                transition={iconTransition}
              />
            </motion.svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {!isRouteMode && menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: ANIMATION.durationMedium, ease: ANIMATION.easing }}
            style={{ willChange: "transform, opacity" }}
            className="saintce-nav mx-4 mt-4 overflow-hidden md:hidden"
          >
            <div className="flex flex-col gap-6 px-6 py-10 text-lg text-(--muted-strong)">
              {itemLinks.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeMenu}
                  className="transition-colors hover:text-(--text-primary)"
                >
                  {item.label}
                </Link>
              ))}

              {!auth.isAuthenticated && (
                <>
                  <Link
                    href="/login"
                    onClick={closeMenu}
                    className="transition-colors hover:text-(--text-primary)"
                  >
                    Login
                  </Link>
                  <Link
                    href="/contact"
                    onClick={closeMenu}
                    className="transition-colors hover:text-(--text-primary)"
                  >
                    Sign Up
                  </Link>
                </>
              )}

              {auth.isAuthenticated && (
                <div className="rounded-[16px] border border-(--border-soft) px-4 py-4">
                  <p className="truncate text-sm text-(--muted)">{auth.email}</p>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="mt-3 text-sm text-(--signal) disabled:opacity-70"
                  >
                    {signingOut ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
