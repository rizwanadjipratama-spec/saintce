import Container from "@/components/ui/Container"
import { siteConfig } from "@/lib/site-config"
import type { FooterContent } from "@/lib/site-sections"

export default function Footer({ content }: { content: FooterContent }) {
  return (
    <footer className="relative py-16">
      <Container>
        <div className="saintce-panel flex flex-col justify-between gap-10 px-8 py-10 md:flex-row md:items-center md:px-10">
          <div>
            <h3 className="font-display text-lg tracking-[0.2em] text-[var(--text-primary)]">
              {siteConfig.brand.name}
            </h3>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
              {content.description}
            </p>
          </div>

          <div className="text-sm tracking-wide text-[var(--muted)]">
            {content.copyright}
          </div>
        </div>
      </Container>
    </footer>
  )
}
