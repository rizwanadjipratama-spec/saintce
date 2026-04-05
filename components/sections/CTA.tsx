"use client"

import { useCallback } from "react"
import { useRouter } from "next/navigation"
import Section from "@/components/ui/Section"
import Container from "@/components/ui/Container"
import { siteConfig } from "@/lib/site-config"

export default function CTA() {
  const router = useRouter()

  const handleContactRoute = useCallback(() => {
    router.push("/contact", { scroll: true })
  }, [router])

  return (
    <Section id="contact">
      <Container>
        <div className="saintce-panel mx-auto max-w-[980px] px-6 py-8 text-center md:px-10 md:py-12">
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-[var(--signal)]">Contact</p>
          <h2 className="mt-5 font-display text-[clamp(2.5rem,5vw,5rem)] leading-[1.02] tracking-[-0.04em] text-[var(--text-primary)]">
            Build the public face and the internal machine together.
          </h2>
          <p className="mx-auto mt-6 max-w-[680px] text-[1rem] leading-[1.8] text-[var(--muted)]">
            Saintce is now structured so the website and admin control layer can evolve as one product instead of two disconnected builds.
          </p>

          <div className="mt-10 flex flex-col items-center gap-5">
            <button onClick={handleContactRoute} className="saintce-button">
              Start an Saintce Build
            </button>
            <a
              href={`mailto:${siteConfig.contact.email}?subject=General%20Inquiry%20-%20${siteConfig.brand.name}`}
              className="text-[0.95rem] text-[var(--muted-strong)] transition-colors hover:text-[var(--text-primary)]"
            >
              {siteConfig.contact.email}
            </a>
          </div>
        </div>
      </Container>
    </Section>
  )
}
