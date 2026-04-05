import type { AboutSection } from "@/lib/about"

export interface AboutContent {
  title: string
  subtitle: string
  paragraph1: string
  paragraph2: string
  paragraph3: string
}

export const FALLBACK_ABOUT_CONTENT: AboutContent = {
  title: "Design the system before scaling the company.",
  subtitle: "Saintce replaces scattered surfaces with one controllable operating layer.",
  paragraph1:
    "This build now reads from the live About CMS when content exists, so the public story can be managed directly from Saintce Control instead of being hardcoded across the frontend.",
  paragraph2:
    "The refactor removes duplicated admin flows and centralizes the data contract, which gives you a cleaner path to expand toward a fuller ERP-style back office.",
  paragraph3:
    "Every visible surface is moving toward one rule: fewer abstractions, fewer duplicate queries, and tighter control over performance and behavior.",
}

export function normalizeAboutContent(data: Partial<AboutSection> | null | undefined): AboutContent {
  const paragraphs = [data?.paragraph1, data?.paragraph2, data?.paragraph3].filter(
    (value): value is string => Boolean(value && value.trim())
  )

  return {
    title: data?.title?.trim() || FALLBACK_ABOUT_CONTENT.title,
    subtitle: data?.subtitle?.trim() || FALLBACK_ABOUT_CONTENT.subtitle,
    paragraph1: paragraphs[0] || FALLBACK_ABOUT_CONTENT.paragraph1,
    paragraph2: paragraphs[1] || FALLBACK_ABOUT_CONTENT.paragraph2,
    paragraph3: paragraphs[2] || FALLBACK_ABOUT_CONTENT.paragraph3,
  }
}
