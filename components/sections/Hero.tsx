"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import type { HeroContent } from "@/lib/site-sections"

export default function Hero({ content }: { content: HeroContent }) {
  const router = useRouter()

  const handleContactRoute = useCallback(() => {
    router.push("/contact", { scroll: true })
  }, [router])

  return (
    <section className="saintce-hero-shell relative flex flex-col justify-center">
      <div className="mx-auto w-full max-w-[1400px] px-6 md:px-10">
        <div className="saintce-hero">
          <div className="grid gap-12 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <p className="mb-6 font-mono text-[0.75rem] uppercase tracking-[0.18em] text-[var(--signal)]">
                {content.eyebrow}
              </p>

              <h1 className="max-w-5xl font-display text-[clamp(3.5rem,8vw,8rem)] leading-[0.96] tracking-[-0.045em] text-[var(--text-primary)]">
                {content.title}
              </h1>

              <p className="mt-8 max-w-[640px] text-[1rem] leading-[1.85] text-[var(--muted)] md:text-[1.08rem]">
                {content.description}
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <button onClick={handleContactRoute} className="saintce-button">
                  {content.primaryLabel}
                </button>
                <a href="/admin" className="saintce-button saintce-button--ghost">
                  {content.secondaryLabel}
                </a>
              </div>
            </div>

            <div className="saintce-panel saintce-panel--inset flex flex-col justify-between gap-8 p-6 md:p-8">
              <div>
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">
                  {content.panelEyebrow}
                </p>
                <div className="mt-6 grid gap-4">
                  <div className="saintce-inset rounded-[24px] p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{content.panelItems[0]?.label}</p>
                    <p className="mt-2 text-3xl font-display text-[var(--text-primary)]">{content.panelItems[0]?.value || content.panelTitle}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="saintce-inset rounded-[22px] p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{content.panelItems[1]?.label}</p>
                      <p className="mt-2 text-lg text-[var(--text-primary)]">
                        {content.panelItems[1]?.value}
                      </p>
                    </div>
                    <div className="saintce-inset rounded-[22px] p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{content.panelItems[2]?.label}</p>
                      <p className="mt-2 text-lg text-[var(--text-primary)]">
                        {content.panelItems[2]?.value}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border-soft)] pt-5 text-sm text-[var(--muted)]">
                <span>{content.footerLeft}</span>
                <span>{content.footerRight}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
