import { supabase } from "@/lib/supabase"

export interface HeroContent {
  eyebrow: string
  title: string
  description: string
  primaryLabel: string
  secondaryLabel: string
  panelEyebrow: string
  panelTitle: string
  panelItems: Array<{ label: string; value: string }>
  footerLeft: string
  footerRight: string
}

export interface ProcessContent {
  eyebrow: string
  title: string
  items: Array<{ number: string; title: string; description: string }>
}

export interface MetricItem {
  value: number
  suffix: string
  label: string
}

export interface MetricsContent {
  items: MetricItem[]
}

export interface CtaContent {
  eyebrow: string
  title: string
  description: string
  buttonLabel: string
}

export interface FooterContent {
  description: string
  copyright: string
}

export interface SiteSectionsContent {
  hero: HeroContent
  process: ProcessContent
  metrics: MetricsContent
  cta: CtaContent
  footer: FooterContent
}

export type SectionKey = keyof SiteSectionsContent

export interface SectionRow {
  section_key: SectionKey
  heading: string | null
  subheading: string | null
  body: string | null
  primary_label: string | null
  secondary_label: string | null
  items: unknown
  meta: unknown
}

const DEFAULT_SITE_SECTIONS: SiteSectionsContent = {
  hero: {
    eyebrow: "Skeuomorphic control surface for modern operations",
    title: "Build the system. Control the surface.",
    description:
      "Saintce turns marketing, client delivery, and internal admin operations into one polished control layer with premium performance and disciplined architecture.",
    primaryLabel: "Launch a Build",
    secondaryLabel: "Open Saintce Control",
    panelEyebrow: "Command Surface",
    panelTitle: "Clients, CMS, Ops",
    panelItems: [
      { label: "Admin Coverage", value: "Clients, CMS, Ops" },
      { label: "Performance", value: "GPU-safe motion, cleaned timers, controlled subscriptions." },
      { label: "Architecture", value: "Centralized data access with less duplication and cleaner state flow." },
    ],
    footerLeft: "Saintce Control",
    footerRight: "Edition 2026",
  },
  process: {
    eyebrow: "Process",
    title: "Built like a control system, not a landing page.",
    items: [
      {
        number: "01",
        title: "Map the system",
        description:
          "We collapse goals, permissions, content flows, and entities into one operating model before visuals or code fan out.",
      },
      {
        number: "02",
        title: "Shape the surface",
        description:
          "Navigation, panels, forms, and actions are designed as tactile control hardware so the interface feels deliberate, not generic.",
      },
      {
        number: "03",
        title: "Engineer the runtime",
        description:
          "We centralize data access, remove duplicate state paths, and keep motion cheap enough for Chrome inspection and real use.",
      },
      {
        number: "04",
        title: "Expand the console",
        description:
          "Once the core is reliable, new modules can grow into CRM, ERP, and internal operations without rewriting the shell.",
      },
    ],
  },
  metrics: {
    items: [
      { value: 1, suffix: "", label: "Unified admin shell" },
      { value: 0, suffix: "", label: "Known timer leaks" },
      { value: 2, suffix: "", label: "Live CMS domains" },
      { value: 100, suffix: "%", label: "Brand consistency target" },
    ],
  },
  cta: {
    eyebrow: "Contact",
    title: "Build the public face and the internal machine together.",
    description:
      "Saintce is now structured so the website and admin control layer can evolve as one product instead of two disconnected builds.",
    buttonLabel: "Start a Saintce Build",
  },
  footer: {
    description: "Premium control surfaces for operations, delivery, and modern enterprise websites.",
    copyright: "Copyright 2026 Saintce Systems. All rights reserved.",
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback
}

function normalizeHero(row?: SectionRow): HeroContent {
  const meta = isRecord(row?.meta) ? row!.meta : {}
  const items = Array.isArray(row?.items) ? row!.items : []

  return {
    eyebrow: asString(row?.heading, DEFAULT_SITE_SECTIONS.hero.eyebrow),
    title: asString(row?.subheading, DEFAULT_SITE_SECTIONS.hero.title),
    description: asString(row?.body, DEFAULT_SITE_SECTIONS.hero.description),
    primaryLabel: asString(row?.primary_label, DEFAULT_SITE_SECTIONS.hero.primaryLabel),
    secondaryLabel: asString(row?.secondary_label, DEFAULT_SITE_SECTIONS.hero.secondaryLabel),
    panelEyebrow: asString(meta.panelEyebrow, DEFAULT_SITE_SECTIONS.hero.panelEyebrow),
    panelTitle: asString(meta.panelTitle, DEFAULT_SITE_SECTIONS.hero.panelTitle),
    panelItems: items
      .filter(isRecord)
      .map((item, index) => ({
        label: asString(item.label, DEFAULT_SITE_SECTIONS.hero.panelItems[index]?.label || `Item ${index + 1}`),
        value: asString(item.value, DEFAULT_SITE_SECTIONS.hero.panelItems[index]?.value || ""),
      }))
      .slice(0, 3)
      .concat(DEFAULT_SITE_SECTIONS.hero.panelItems)
      .slice(0, 3),
    footerLeft: asString(meta.footerLeft, DEFAULT_SITE_SECTIONS.hero.footerLeft),
    footerRight: asString(meta.footerRight, DEFAULT_SITE_SECTIONS.hero.footerRight),
  }
}

function normalizeProcess(row?: SectionRow): ProcessContent {
  const items = Array.isArray(row?.items) ? row!.items : []

  return {
    eyebrow: asString(row?.heading, DEFAULT_SITE_SECTIONS.process.eyebrow),
    title: asString(row?.subheading, DEFAULT_SITE_SECTIONS.process.title),
    items: items
      .filter(isRecord)
      .map((item, index) => ({
        number: asString(item.number, DEFAULT_SITE_SECTIONS.process.items[index]?.number || `0${index + 1}`),
        title: asString(item.title, DEFAULT_SITE_SECTIONS.process.items[index]?.title || ""),
        description: asString(item.description, DEFAULT_SITE_SECTIONS.process.items[index]?.description || ""),
      }))
      .slice(0, 4)
      .concat(DEFAULT_SITE_SECTIONS.process.items)
      .slice(0, 4),
  }
}

function normalizeMetrics(row?: SectionRow): MetricsContent {
  const items = Array.isArray(row?.items) ? row!.items : []

  return {
    items: items
      .filter(isRecord)
      .map((item, index) => ({
        value:
          typeof item.value === "number"
            ? item.value
            : Number(item.value ?? DEFAULT_SITE_SECTIONS.metrics.items[index]?.value ?? 0),
        suffix: asString(item.suffix, DEFAULT_SITE_SECTIONS.metrics.items[index]?.suffix || ""),
        label: asString(item.label, DEFAULT_SITE_SECTIONS.metrics.items[index]?.label || ""),
      }))
      .slice(0, 4)
      .concat(DEFAULT_SITE_SECTIONS.metrics.items)
      .slice(0, 4),
  }
}

function normalizeCta(row?: SectionRow): CtaContent {
  return {
    eyebrow: asString(row?.heading, DEFAULT_SITE_SECTIONS.cta.eyebrow),
    title: asString(row?.subheading, DEFAULT_SITE_SECTIONS.cta.title),
    description: asString(row?.body, DEFAULT_SITE_SECTIONS.cta.description),
    buttonLabel: asString(row?.primary_label, DEFAULT_SITE_SECTIONS.cta.buttonLabel),
  }
}

function normalizeFooter(row?: SectionRow): FooterContent {
  return {
    description: asString(row?.body, DEFAULT_SITE_SECTIONS.footer.description),
    copyright: asString(row?.primary_label, DEFAULT_SITE_SECTIONS.footer.copyright),
  }
}

function mapRowsToSections(rows: SectionRow[] | null | undefined): SiteSectionsContent {
  const sections = new Map<SectionKey, SectionRow>()

  for (const row of rows ?? []) {
    sections.set(row.section_key, row)
  }

  return {
    hero: normalizeHero(sections.get("hero")),
    process: normalizeProcess(sections.get("process")),
    metrics: normalizeMetrics(sections.get("metrics")),
    cta: normalizeCta(sections.get("cta")),
    footer: normalizeFooter(sections.get("footer")),
  }
}

export async function getPublicSiteSections() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return DEFAULT_SITE_SECTIONS
  }

  try {
    const response = await fetch(
      `${url}/rest/v1/site_content_sections?select=section_key,heading,subheading,body,primary_label,secondary_label,items,meta&order=section_key.asc`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        next: { revalidate: 300 },
      }
    )

    if (!response.ok) {
      return DEFAULT_SITE_SECTIONS
    }

    const rows = (await response.json()) as SectionRow[]
    return mapRowsToSections(rows)
  } catch {
    return DEFAULT_SITE_SECTIONS
  }
}

export async function fetchAdminSiteSections() {
  const { data, error } = await supabase
    .from("site_content_sections")
    .select("section_key, heading, subheading, body, primary_label, secondary_label, items, meta")
    .order("section_key", { ascending: true })

  if (error) {
    throw error
  }

  return mapRowsToSections(data as SectionRow[])
}

export async function upsertSiteSection(sectionKey: SectionKey, payload: SectionRow) {
  const { error } = await supabase.from("site_content_sections").upsert(
    {
      section_key: sectionKey,
      heading: payload.heading,
      subheading: payload.subheading,
      body: payload.body,
      primary_label: payload.primary_label,
      secondary_label: payload.secondary_label,
      items: payload.items,
      meta: payload.meta,
    },
    { onConflict: "section_key" }
  )

  if (error) {
    throw error
  }
}

export function getDefaultSiteSections() {
  return DEFAULT_SITE_SECTIONS
}
