export const siteConfig = {
  brand: {
    name: "Orion",
    legalName: "Orion Systems",
    adminName: "Orion Control",
    tag: "Precision Operating System",
  },
  contact: {
    email: "ajcorp2026@gmail.com",
    adminEmail: "rizwanadjipratama@gmail.com",
  },
  copy: {
    title: "Orion | Skeuomorphic Control System",
    description:
      "Orion is a premium operating layer for high-performance websites, client systems, and admin operations.",
    heroEyebrow: "Skeuomorphic control surface for modern operations",
    heroTitle: "Build the system. Control the surface.",
    heroDescription:
      "Orion turns marketing, client delivery, and internal admin operations into one polished control layer with premium performance and disciplined architecture.",
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
