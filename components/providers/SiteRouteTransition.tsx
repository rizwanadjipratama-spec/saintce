"use client"

import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { ANIMATION } from "@/lib/animation"

/**
 * COMPONENT: SiteRouteTransition
 * PURPOSE: Standardized App Router transition wrapper.
 * PERFORMANCE: Uses GPU-friendly opacity + translateY only.
 */
export default function SiteRouteTransition({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: ANIMATION.routeTranslateY }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: ANIMATION.routeTranslateY }}
        transition={{ duration: ANIMATION.durationMedium, ease: ANIMATION.easing }}
        style={{ willChange: "transform, opacity" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
