import Section from "@/components/ui/Section"
import Container from "@/components/ui/Container"
import type { ProcessContent } from "@/lib/site-sections"

export default function Process({ content }: { content: ProcessContent }) {
  return (
    <Section id="process">
      <Container>
        <div className="mb-12">
          <p className="mb-5 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-[var(--signal)]">
            {content.eyebrow}
          </p>
          <h2 className="font-display text-[clamp(2.4rem,4.8vw,4.2rem)] leading-[1.02] tracking-[-0.04em] text-[var(--text-primary)]">
            {content.title}
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-4">
          {content.items.map((step) => (
            <article key={step.number} className="saintce-panel saintce-panel--inset p-6">
              <p className="font-mono text-[0.76rem] uppercase tracking-[0.16em] text-[var(--signal)]">
                {step.number}
              </p>
              <h3 className="mt-8 font-display text-2xl text-[var(--text-primary)]">{step.title}</h3>
              <p className="mt-4 text-[0.98rem] leading-[1.8] text-[var(--muted)]">{step.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  )
}
