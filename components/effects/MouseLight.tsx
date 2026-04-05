"use client"

import { useEffect } from "react"

/**
 * COMPONENT: MouseLight
 * PURPOSE: Updates global cursor light variables.
 * PERFORMANCE: Throttled with requestAnimationFrame to reduce style churn.
 */
export default function MouseLight() {
  useEffect(() => {
    let rafId = 0
    let pendingX = 0
    let pendingY = 0

    const flushPosition = () => {
      document.body.style.setProperty("--mouse-x", `${pendingX}px`)
      document.body.style.setProperty("--mouse-y", `${pendingY}px`)
      rafId = 0
    }

    const handleMove = (e: MouseEvent) => {
      pendingX = e.clientX
      pendingY = e.clientY

      if (rafId !== 0) return
      rafId = requestAnimationFrame(flushPosition)
    }

    window.addEventListener("mousemove", handleMove)

    return () => {
      if (rafId !== 0) {
        cancelAnimationFrame(rafId)
      }
      window.removeEventListener("mousemove", handleMove)
    }
  }, [])

  return null
}
