import "./globals.css"
import { Cormorant_Garamond, DM_Sans, DM_Mono } from "next/font/google"
import MouseLight from "@/components/effects/MouseLight"
import SmoothScroll from "@/components/providers/SmoothScroll"
import type { Metadata, Viewport } from "next"
import { siteConfig } from "@/lib/site-config"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
})

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: siteConfig.copy.title,
  description: siteConfig.copy.description,
  applicationName: siteConfig.brand.name,
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#111114",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${dmSans.variable} ${dmMono.variable}`}
    >
      <body className="saintce-body antialiased relative">
        <MouseLight />
        <SmoothScroll>
          {children}
        </SmoothScroll>
      </body>
    </html>
  )
}
