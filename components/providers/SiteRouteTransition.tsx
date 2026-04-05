"use client"

import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import { ANIMATION } from "@/lib/animation"

/**
 * COMPONENT: SiteRouteTransition
 * PURPOSE: Standardized App Router transition wrapper.
 * PERFORMANCE: Uses GPU-friendly opacity + translateY only.
 * NOTE: willChange is NOT set statically — a permanent compositing layer causes
 * white-flash during fast scroll because the fixed background canvas sits outside
 * the layer's paint context. Framer Motion sets it internally only during animation.
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
        style={{
          backfaceVisibility: "hidden",
          backgroundColor: "transparent",
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
