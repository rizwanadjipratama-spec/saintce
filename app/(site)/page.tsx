import Hero from "@/components/sections/Hero"
import Marquee from "@/components/ui/Marquee"
import About from "@/components/sections/About"
import Process from "@/components/sections/Process"
import Metrics from "@/components/sections/Metrics"
import CTA from "@/components/sections/CTA"
import { getPublicSiteSections } from "@/lib/site-sections"

export default async function Home() {
  const sections = await getPublicSiteSections()

  return (
    <main className="relative z-10">
      <Hero content={sections.hero} />
      <Marquee />
      <About />
      <Process content={sections.process} />
      <Metrics content={sections.metrics} />
      <CTA content={sections.cta} />
    </main>
  )
}
