import { siteConfig } from "@/lib/site-config"
import PortalShell from "@/components/portal/PortalShell"

export const metadata = {
  title: `Client Portal — ${siteConfig.brand.name}`,
  robots: { index: false, follow: false },
}

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <PortalShell>{children}</PortalShell>
}
