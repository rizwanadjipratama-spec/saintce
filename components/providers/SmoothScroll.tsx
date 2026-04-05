"use client"

import { useEffect } from "react"
import Lenis from "lenis"

/**
 * COMPONENT: SmoothScroll
 * PURPOSE: Provides global smooth scroll behavior.
 * PERFORMANCE: Cancels requestAnimationFrame loop on unmount to avoid leaks.
 */
export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      wheelMultiplier: 1,
      //smoothTouch: false,
    })
    let rafId = 0

    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }

    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
