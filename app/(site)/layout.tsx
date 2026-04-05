import Navbar from "@/components/layouts/Navbar"
import Footer from "@/components/layouts/Footer"
import SiteRouteTransition from "@/components/providers/SiteRouteTransition"

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      <main className="relative z-10">
        <SiteRouteTransition>{children}</SiteRouteTransition>
      </main>
      <Footer />
    </>
  )
}
