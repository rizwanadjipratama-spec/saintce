"use client"

import { useEffect } from "react"
import Lenis from "lenis"

/**
 * COMPONENT: SmoothScroll
 * PURPOSE: Provides global smooth scroll behavior via Lenis.
 * PERFORMANCE:
 *   - RAF loop cancels on unmount (no leak).
 *   - RAF pauses when tab is hidden and resumes on visibility, preventing
 *     stale scroll state and wasted GPU cycles on hidden tabs.
 *   - lerp-based interpolation instead of duration: more responsive on fast
 *     scroll, less likely to create a long momentum tail that causes white tiles.
 *   - Disabled on touch-like devices and reduced-motion preference.
 */
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const isTouchLikeDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches

    if (prefersReducedMotion || isTouchLikeDevice) {
      return
    }

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.5,
      infinite: false,
    })

    let rafId = 0
    let running = true

    function raf(time: number) {
      if (!running) return
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }

    rafId = requestAnimationFrame(raf)

    function handleVisibilityChange() {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(rafId)
        rafId = 0
      } else {
        running = true
        rafId = requestAnimationFrame(raf)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      running = false
      cancelAnimationFrame(rafId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
