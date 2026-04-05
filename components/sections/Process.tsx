import Section from "@/components/ui/Section"
import Container from "@/components/ui/Container"

const steps = [
  {
    number: "01",
    title: "Map the system",
    description:
      "We collapse goals, permissions, content flows, and entities into one operating model before visuals or code fan out.",
  },
  {
    number: "02",
    title: "Shape the surface",
    description:
      "Navigation, panels, forms, and actions are designed as tactile control hardware so the interface feels deliberate, not generic.",
  },
  {
    number: "03",
    title: "Engineer the runtime",
    description:
      "We centralize data access, remove duplicate state paths, and keep motion cheap enough for Chrome inspection and real use.",
  },
  {
    number: "04",
    title: "Expand the console",
    description:
      "Once the core is reliable, new modules can grow into CRM, ERP, and internal operations without rewriting the shell.",
  },
]

export default function Process() {
  return (
    <Section id="process">
      <Container>
        <div className="mb-12">
          <p className="mb-5 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-[var(--signal)]">
            Process
          </p>
          <h2 className="font-display text-[clamp(2.4rem,4.8vw,4.2rem)] leading-[1.02] tracking-[-0.04em] text-[var(--text-primary)]">
            Built like a control system, not a landing page.
          </h2>
        </div>

        <div className="grid gap-5 lg:grid-cols-4">
          {steps.map((step) => (
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
