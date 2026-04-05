"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import Section from "@/components/ui/Section"
import Container from "@/components/ui/Container"
import { ANIMATION } from "@/lib/animation"
import type { MetricsContent } from "@/lib/site-sections"

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement | null>(null)
  const isInView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) {
      return
    }

    let start: number | null = null
    let rafId = 0
    const duration = 900

    const animate = (timestamp: number) => {
      if (start === null) {
        start = timestamp
      }

      const progress = Math.min((timestamp - start) / duration, 1)
      setCount(Math.round(progress * value))

      if (progress < 1) {
        rafId = requestAnimationFrame(animate)
      }
    }

    rafId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId)
    }
  }, [isInView, value])

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  )
}

export default function Metrics({ content }: { content: MetricsContent }) {
  return (
    <Section subtleBg>
      <Container>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {content.items.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: ANIMATION.durationSlow,
                delay: index * 0.06,
                ease: ANIMATION.easing,
              }}
              className="saintce-panel flex flex-col justify-between p-6"
              style={{ willChange: "transform, opacity" }}
            >
              <div className="font-display text-[clamp(2.8rem,6vw,4.8rem)] text-[var(--text-primary)]">
                <Counter value={item.value} suffix={item.suffix} />
              </div>
              <div className="mt-3 font-mono text-[0.82rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                {item.label}
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </Section>
  )
}
