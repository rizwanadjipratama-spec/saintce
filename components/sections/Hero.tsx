"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import { siteConfig } from "@/lib/site-config"

export default function Hero() {
  const router = useRouter()

  const handleContactRoute = useCallback(() => {
    router.push("/contact", { scroll: true })
  }, [router])

  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center pt-[clamp(6rem,11vh,8rem)]">
      <div className="mx-auto w-full max-w-[1400px] px-6 md:px-10">
        <div className="orion-hero">
          <div className="grid gap-12 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <p className="mb-6 font-mono text-[0.75rem] uppercase tracking-[0.18em] text-[var(--signal)]">
                {siteConfig.copy.heroEyebrow}
              </p>

              <h1 className="max-w-5xl font-display text-[clamp(3.5rem,8vw,8rem)] leading-[0.96] tracking-[-0.045em] text-[var(--text-primary)]">
                {siteConfig.copy.heroTitle}
              </h1>

              <p className="mt-8 max-w-[640px] text-[1rem] leading-[1.85] text-[var(--muted)] md:text-[1.08rem]">
                {siteConfig.copy.heroDescription}
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <button onClick={handleContactRoute} className="orion-button">
                  Launch a Build
                </button>
                <a href="/admin" className="orion-button orion-button--ghost">
                  Open Orion Control
                </a>
              </div>
            </div>

            <div className="orion-panel orion-panel--inset flex flex-col justify-between gap-8 p-6 md:p-8">
              <div>
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">
                  Command Surface
                </p>
                <div className="mt-6 grid gap-4">
                  <div className="orion-inset rounded-[24px] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Admin Coverage</p>
                    <p className="mt-2 text-3xl font-display text-[var(--text-primary)]">Clients, CMS, Ops</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="orion-inset rounded-[22px] p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Performance</p>
                      <p className="mt-2 text-lg text-[var(--text-primary)]">
                        GPU-safe motion, cleaned timers, controlled subscriptions.
                      </p>
                    </div>
                    <div className="orion-inset rounded-[22px] p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Architecture</p>
                      <p className="mt-2 text-lg text-[var(--text-primary)]">
                        Centralized data access with less duplication and cleaner state flow.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border-soft)] pt-5 text-sm text-[var(--muted)]">
                <span>{siteConfig.brand.adminName}</span>
                <span>Edition 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
