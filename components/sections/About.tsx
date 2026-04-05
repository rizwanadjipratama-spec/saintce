"use client"

import { useEffect, useState } from "react"
import Section from "@/components/ui/Section"
import Container from "@/components/ui/Container"
import { fetchAboutSection } from "@/lib/about"

interface AboutState {
  title: string
  subtitle: string
  paragraph1: string
  paragraph2: string
  paragraph3: string
}

const EMPTY_STATE: AboutState = {
  title: "Design the system before scaling the company.",
  subtitle: "Orion replaces scattered surfaces with one controllable operating layer.",
  paragraph1:
    "This build now reads from the live About CMS when content exists, so the public story can be managed directly from Orion Control instead of being hardcoded across the frontend.",
  paragraph2:
    "The refactor removes duplicated admin flows and centralizes the data contract, which gives you a cleaner path to expand toward a fuller ERP-style back office.",
  paragraph3:
    "Every visible surface is moving toward one rule: fewer abstractions, fewer duplicate queries, and tighter control over performance and behavior.",
}

export default function About() {
  const [content, setContent] = useState<AboutState>(EMPTY_STATE)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const data = await fetchAboutSection()

        if (!active || !data) {
          return
        }

        const paragraphs = [data.paragraph1, data.paragraph2, data.paragraph3].filter(Boolean)

        setContent({
          title: data.title || EMPTY_STATE.title,
          subtitle: data.subtitle || EMPTY_STATE.subtitle,
          paragraph1: paragraphs[0] || EMPTY_STATE.paragraph1,
          paragraph2: paragraphs[1] || EMPTY_STATE.paragraph2,
          paragraph3: paragraphs[2] || EMPTY_STATE.paragraph3,
        })
      } catch {
        if (active) {
          setContent(EMPTY_STATE)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  return (
    <Section id="about">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-[6rem]">
          <div>
            <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-[var(--signal)]">About</p>
            <h2 className="mt-6 font-display text-[clamp(2.4rem,4.5vw,4rem)] leading-[1.05] tracking-[-0.04em] text-[var(--text-primary)]">
              {content.title}
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-[1.7] text-[var(--muted)]">{content.subtitle}</p>
          </div>

          <div className="orion-panel p-6 md:p-8">
            <div className="grid gap-5 md:grid-cols-3">
              {[content.paragraph1, content.paragraph2, content.paragraph3].map((paragraph, index) => (
                <div key={index} className="orion-inset rounded-[24px] p-5">
                  <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-[var(--muted)]">
                    Node 0{index + 1}
                  </p>
                  <p className="mt-4 text-[0.98rem] leading-[1.8] text-[var(--text-primary)]">{paragraph}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  )
}
