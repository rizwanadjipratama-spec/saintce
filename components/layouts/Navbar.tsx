"use client"

import { useCallback, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ANIMATION } from "@/lib/animation"
import { siteConfig } from "@/lib/site-config"

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const isRouteMode = pathname === "/contact" || pathname === "/clients"
  const [menuOpen, setMenuOpen] = useState(false)

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

  const itemLinks = useMemo(() => siteConfig.navigation, [])
  const shouldShowClose = isRouteMode || menuOpen
  const handleMobileIconClick = isRouteMode ? handleBack : toggleMenu
  const iconTransition = { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }

  return (
    <header className="fixed top-0 left-0 z-100 w-full px-4 pt-4 md:px-8">
      <div className="saintce-nav mx-auto flex h-19.5 max-w-365 items-center justify-between px-6 md:px-8">
        {/* Left — nav links */}
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
                  <a
                    key={item.label}
                    href={item.href}
                    className="transition-colors hover:text-(--text-primary)"
                  >
                    {item.label}
                  </a>
                ))}
              </motion.nav>
            )}
          </AnimatePresence>
        </div>

        {/* Center — brand */}
        <div className="absolute left-1/2 -translate-x-1/2 select-none font-display text-sm tracking-[0.32em] text-(--text-primary)">
          {siteConfig.brand.name}
        </div>

        {/* Right — clients + login */}
        <div className="flex items-center gap-4">
          {!isRouteMode && (
            <Link
              href="/login"
              className="hidden saintce-button min-h-9.5 px-5 text-sm md:inline-flex"
            >
              Login
            </Link>
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

      {/* Mobile menu */}
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
                <a
                  key={item.label}
                  href={item.href}
                  onClick={closeMenu}
                  className="transition-colors hover:text-(--text-primary)"
                >
                  {item.label}
                </a>
              ))}
              <Link href="/login" onClick={closeMenu} className="transition-colors hover:text-(--text-primary)">
                Login
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
