import Navbar from "@/components/layouts/Navbar"
import Footer from "@/components/layouts/Footer"
import SiteRouteTransition from "@/components/providers/SiteRouteTransition"
import { getPublicSiteSections } from "@/lib/site-sections"

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const sections = await getPublicSiteSections()

  return (
    <>
      <Navbar />
      <main className="saintce-page-shell relative z-10">
        <SiteRouteTransition>{children}</SiteRouteTransition>
      </main>
      <Footer content={sections.footer} />
    </>
  )
}
