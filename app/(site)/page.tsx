import Hero from "@/components/sections/Hero"
import Marquee from "@/components/ui/Marquee"
import About from "@/components/sections/About"
import Process from "@/components/sections/Process"
import Metrics from "@/components/sections/Metrics"
import CTA from "@/components/sections/CTA"

export default function Home() {
  return (
    <main className="relative z-10">
      <Hero />
      <Marquee />
      <About />
      <Process />
      <Metrics />
      <CTA />
    </main>
  )
}
