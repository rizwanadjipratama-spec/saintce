export const siteConfig = {
  brand: {
    name: "Saintce",
    legalName: "Saintce Systems",
    adminName: "Saintce Control",
    tag: "Precision Operating System",
  },
  contact: {
    email: "ajcorp2026@gmail.com",
    adminEmail: "rizwanadjipratama@gmail.com",
  },
  copy: {
    title: "Saintce | Skeuomorphic Control System",
    description:
      "Saintce is a premium operating layer for high-performance websites, client systems, and admin operations.",
    heroEyebrow: "Skeuomorphic control surface for modern operations",
    heroTitle: "Build the system. Control the surface.",
    heroDescription:
      "Saintce turns marketing, client delivery, and internal admin operations into one polished control layer with premium performance and disciplined architecture.",
  },
  navigation: [
    { label: "About", href: "/#about" },
    { label: "Process", href: "/#process" },
    { label: "Contact", href: "/#contact" },
  ],
} as const

export function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
}
