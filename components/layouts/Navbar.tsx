"use client"

import { useCallback, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
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
    <header className="fixed top-0 left-0 z-[100] w-full px-4 pt-4 md:px-8">
      <div className="orion-nav mx-auto flex h-[78px] max-w-[1460px] items-center justify-between px-6 md:px-8">
        <div className="hidden items-center text-sm text-[var(--muted-strong)] md:flex">
          <AnimatePresence mode="wait">
            {isRouteMode ? (
              <motion.button
                key="back"
                onClick={handleBack}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: ANIMATION.durationMedium, ease: ANIMATION.easing }}
                className="transition-colors hover:text-[var(--text-primary)]"
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
                    className="transition-colors hover:text-[var(--text-primary)]"
                  >
                    {item.label}
                  </a>
                ))}
              </motion.nav>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 select-none text-sm font-display tracking-[0.32em] text-[var(--text-primary)]">
          {siteConfig.brand.name}
        </div>

        <div className="flex items-center gap-6">
          {!isRouteMode && (
            <a
              href="/clients"
              className="hidden text-sm text-[var(--muted-strong)] transition-colors hover:text-[var(--text-primary)] md:block"
            >
              Clients
            </a>
          )}

          <button
            onClick={handleMobileIconClick}
            className="z-[200] text-xl text-[var(--text-primary)] md:hidden"
            aria-label={shouldShowClose ? "Close menu" : "Open menu"}
          >
            <motion.svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <motion.line
                x1="4"
                y1="7"
                x2="20"
                y2="7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ transformOrigin: "50% 50%", willChange: "transform, opacity" }}
                animate={shouldShowClose ? { y: 5, rotate: 45 } : { y: 0, rotate: 0 }}
                transition={iconTransition}
              />
              <motion.line
                x1="4"
                y1="12"
                x2="20"
                y2="12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ transformOrigin: "50% 50%", willChange: "transform, opacity" }}
                animate={shouldShowClose ? { opacity: 0 } : { opacity: 1 }}
                transition={iconTransition}
              />
              <motion.line
                x1="4"
                y1="17"
                x2="20"
                y2="17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
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
            className="orion-nav mx-4 mt-4 overflow-hidden md:hidden"
          >
            <div className="flex flex-col gap-6 px-6 py-10 text-lg text-[var(--muted-strong)]">
              {itemLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={closeMenu}
                  className="transition-colors hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </a>
              ))}
              <a
                href="/clients"
                onClick={closeMenu}
                className="transition-colors hover:text-[var(--text-primary)]"
              >
                Clients
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
