"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ensureAboutSection, updateAboutSection, type AboutSection } from "@/lib/about"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"
import {
  fetchAdminSiteSections,
  getDefaultSiteSections,
  upsertSiteSection,
  type SiteSectionsContent,
} from "@/lib/site-sections"

export default function AdminSectionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [sections, setSections] = useState<SiteSectionsContent>(getDefaultSiteSections())
  const [about, setAbout] = useState<AboutSection | null>(null)

  const loadSections = useCallback(async () => {
    try {
      const [data, aboutSection] = await Promise.all([
        fetchAdminSiteSections(),
        ensureAboutSection(),
      ])
      setSections(data)
      setAbout(aboutSection)
      setMessage(null)
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load section CMS."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    const init = async () => {
      const allowed = await hasAdminAccess()

      if (!allowed) {
        router.replace("/login")
        return
      }

      if (active) {
        await loadSections()
      }
    }

    void init()

    return () => {
      active = false
    }
  }, [loadSections, router])

  const handleSaveAll = useCallback(async () => {
    setSaving(true)
    setMessage(null)

    try {
      await Promise.all([
        upsertSiteSection("hero", {
          section_key: "hero",
          heading: sections.hero.eyebrow,
          subheading: sections.hero.title,
          body: sections.hero.description,
          primary_label: sections.hero.primaryLabel,
          secondary_label: sections.hero.secondaryLabel,
          items: sections.hero.panelItems,
          meta: {
            panelEyebrow: sections.hero.panelEyebrow,
            panelTitle: sections.hero.panelTitle,
            footerLeft: sections.hero.footerLeft,
            footerRight: sections.hero.footerRight,
          },
        }),
        upsertSiteSection("process", {
          section_key: "process",
          heading: sections.process.eyebrow,
          subheading: sections.process.title,
          body: null,
          primary_label: null,
          secondary_label: null,
          items: sections.process.items,
          meta: {},
        }),
        upsertSiteSection("cta", {
          section_key: "cta",
          heading: sections.cta.eyebrow,
          subheading: sections.cta.title,
          body: sections.cta.description,
          primary_label: sections.cta.buttonLabel,
          secondary_label: null,
          items: [],
          meta: {},
        }),
        upsertSiteSection("footer", {
          section_key: "footer",
          heading: null,
          subheading: null,
          body: sections.footer.description,
          primary_label: sections.footer.copyright,
          secondary_label: null,
          items: [],
          meta: {},
        }),
        about
          ? updateAboutSection({
              id: about.id,
              title: about.title,
              subtitle: about.subtitle,
              paragraph1: about.paragraph1,
              paragraph2: about.paragraph2,
              paragraph3: about.paragraph3,
            })
          : Promise.resolve(null),
      ])

      setMessage("Section CMS saved.")
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save section CMS."))
    } finally {
      setSaving(false)
    }
  }, [about, sections])

  if (loading) {
    return <div className="text-[var(--muted)]">Loading section CMS...</div>
  }

  return (
    <div>
      <div className="border-b border-[var(--border-soft)] pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-[var(--signal)]">Sections</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          Site section CMS
        </h1>
      </div>

      <div className="mt-8 space-y-6">
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="font-display text-2xl">Hero</h2>
          <div className="mt-5 grid gap-4">
            <input value={sections.hero.eyebrow} onChange={(e) => setSections((prev) => ({ ...prev, hero: { ...prev.hero, eyebrow: e.target.value } }))} className="saintce-input" placeholder="Eyebrow" />
            <textarea value={sections.hero.title} onChange={(e) => setSections((prev) => ({ ...prev, hero: { ...prev.hero, title: e.target.value } }))} className="saintce-input min-h-[120px]" placeholder="Hero title" />
            <textarea value={sections.hero.description} onChange={(e) => setSections((prev) => ({ ...prev, hero: { ...prev.hero, description: e.target.value } }))} className="saintce-input min-h-[160px]" placeholder="Hero description" />
            <div className="grid gap-4 md:grid-cols-2">
              <input value={sections.hero.primaryLabel} onChange={(e) => setSections((prev) => ({ ...prev, hero: { ...prev.hero, primaryLabel: e.target.value } }))} className="saintce-input" placeholder="Primary button" />
              <input value={sections.hero.secondaryLabel} onChange={(e) => setSections((prev) => ({ ...prev, hero: { ...prev.hero, secondaryLabel: e.target.value } }))} className="saintce-input" placeholder="Secondary button" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input value={sections.hero.panelEyebrow} onChange={(e) => setSections((prev) => ({ ...prev, hero: { ...prev.hero, panelEyebrow: e.target.value } }))} className="saintce-input" placeholder="Panel eyebrow" />
              <input value={sections.hero.panelTitle} onChange={(e) => setSections((prev) => ({ ...prev, hero: { ...prev.hero, panelTitle: e.target.value } }))} className="saintce-input" placeholder="Panel title" />
            </div>
            {sections.hero.panelItems.map((item, index) => (
              <div key={index} className="grid gap-4 md:grid-cols-2">
                <input
                  value={item.label}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      hero: {
                        ...prev.hero,
                        panelItems: prev.hero.panelItems.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, label: e.target.value } : entry
                        ),
                      },
                    }))
                  }
                  className="saintce-input"
                  placeholder={`Panel item ${index + 1} label`}
                />
                <input
                  value={item.value}
                  onChange={(e) =>
                    setSections((prev) => ({
                      ...prev,
                      hero: {
                        ...prev.hero,
                        panelItems: prev.hero.panelItems.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, value: e.target.value } : entry
                        ),
                      },
                    }))
                  }
                  className="saintce-input"
                  placeholder={`Panel item ${index + 1} value`}
                />
              </div>
            ))}
            <div className="grid gap-4 md:grid-cols-2">
              <input value={sections.hero.footerLeft} onChange={(e) => setSections((prev) => ({ ...prev, hero: { ...prev.hero, footerLeft: e.target.value } }))} className="saintce-input" placeholder="Hero footer left" />
              <input value={sections.hero.footerRight} onChange={(e) => setSections((prev) => ({ ...prev, hero: { ...prev.hero, footerRight: e.target.value } }))} className="saintce-input" placeholder="Hero footer right" />
            </div>
          </div>
        </section>

        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="font-display text-2xl">About</h2>
          <div className="mt-5 grid gap-4">
            <input
              value={about?.title || ""}
              onChange={(e) => setAbout((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
              className="saintce-input"
              placeholder="About headline"
            />
            <input
              value={about?.subtitle || ""}
              onChange={(e) => setAbout((prev) => (prev ? { ...prev, subtitle: e.target.value } : prev))}
              className="saintce-input"
              placeholder="About subtitle"
            />
            <textarea
              value={about?.paragraph1 || ""}
              onChange={(e) => setAbout((prev) => (prev ? { ...prev, paragraph1: e.target.value } : prev))}
              className="saintce-input min-h-[140px]"
              placeholder="About paragraph 1"
            />
            <textarea
              value={about?.paragraph2 || ""}
              onChange={(e) => setAbout((prev) => (prev ? { ...prev, paragraph2: e.target.value } : prev))}
              className="saintce-input min-h-[140px]"
              placeholder="About paragraph 2"
            />
            <textarea
              value={about?.paragraph3 || ""}
              onChange={(e) => setAbout((prev) => (prev ? { ...prev, paragraph3: e.target.value } : prev))}
              className="saintce-input min-h-[140px]"
              placeholder="About paragraph 3"
            />
          </div>
        </section>

        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="font-display text-2xl">Process</h2>
          <div className="mt-5 grid gap-4">
            <input value={sections.process.eyebrow} onChange={(e) => setSections((prev) => ({ ...prev, process: { ...prev.process, eyebrow: e.target.value } }))} className="saintce-input" placeholder="Process eyebrow" />
            <textarea value={sections.process.title} onChange={(e) => setSections((prev) => ({ ...prev, process: { ...prev.process, title: e.target.value } }))} className="saintce-input min-h-[120px]" placeholder="Process title" />
            {sections.process.items.map((item, index) => (
              <div key={index} className="rounded-[22px] border border-[var(--border-soft)] p-4">
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-[120px_1fr]">
                    <input value={item.number} onChange={(e) => setSections((prev) => ({ ...prev, process: { ...prev.process, items: prev.process.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, number: e.target.value } : entry) } }))} className="saintce-input" placeholder="Number" />
                    <input value={item.title} onChange={(e) => setSections((prev) => ({ ...prev, process: { ...prev.process, items: prev.process.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: e.target.value } : entry) } }))} className="saintce-input" placeholder="Step title" />
                  </div>
                  <textarea value={item.description} onChange={(e) => setSections((prev) => ({ ...prev, process: { ...prev.process, items: prev.process.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, description: e.target.value } : entry) } }))} className="saintce-input min-h-[120px]" placeholder="Step description" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="font-display text-2xl">CTA</h2>
          <div className="mt-5 grid gap-4">
            <input value={sections.cta.eyebrow} onChange={(e) => setSections((prev) => ({ ...prev, cta: { ...prev.cta, eyebrow: e.target.value } }))} className="saintce-input" placeholder="CTA eyebrow" />
            <textarea value={sections.cta.title} onChange={(e) => setSections((prev) => ({ ...prev, cta: { ...prev.cta, title: e.target.value } }))} className="saintce-input min-h-[120px]" placeholder="CTA title" />
            <textarea value={sections.cta.description} onChange={(e) => setSections((prev) => ({ ...prev, cta: { ...prev.cta, description: e.target.value } }))} className="saintce-input min-h-[140px]" placeholder="CTA description" />
            <input value={sections.cta.buttonLabel} onChange={(e) => setSections((prev) => ({ ...prev, cta: { ...prev.cta, buttonLabel: e.target.value } }))} className="saintce-input" placeholder="CTA button label" />
          </div>
        </section>

        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="font-display text-2xl">Footer</h2>
          <div className="mt-5 grid gap-4">
            <textarea value={sections.footer.description} onChange={(e) => setSections((prev) => ({ ...prev, footer: { ...prev.footer, description: e.target.value } }))} className="saintce-input min-h-[120px]" placeholder="Footer description" />
            <input value={sections.footer.copyright} onChange={(e) => setSections((prev) => ({ ...prev, footer: { ...prev.footer, copyright: e.target.value } }))} className="saintce-input" placeholder="Copyright line" />
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button onClick={handleSaveAll} disabled={saving} className="saintce-button">
          {saving ? "Saving..." : "Save all sections"}
        </button>
        {message && <p className="text-[var(--muted-strong)]">{message}</p>}
      </div>
    </div>
  )
}
