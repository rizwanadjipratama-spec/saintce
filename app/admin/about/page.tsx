"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ensureAboutSection, updateAboutSection, type AboutSection } from "@/lib/about"
import { hasAdminAccess } from "@/lib/admin-auth"
import { supabase } from "@/lib/supabase"

export default function AdminAboutPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [data, setData] = useState<AboutSection | null>(null)

  const load = useCallback(async () => {
    try {
      const about = await ensureAboutSection()
      setData(about)
      setMessage(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load about content.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    const init = async () => {
      const allowed = await hasAdminAccess()

      if (!allowed) {
        router.replace("/")
        return
      }

      if (active) {
        await load()
      }
    }

    void init()

    return () => {
      active = false
    }
  }, [load, router])

  useEffect(() => {
    const channel = supabase
      .channel("orion-about")
      .on("postgres_changes", { event: "*", schema: "public", table: "about_section" }, () => {
        void load()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  const handleSave = useCallback(async () => {
    if (!data) {
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const saved = await updateAboutSection(data)
      setData(saved)
      setMessage("About content saved.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save content.")
    } finally {
      setSaving(false)
    }
  }, [data])

  if (loading || !data) {
    return <div className="text-[var(--muted)]">Loading About content...</div>
  }

  return (
    <div>
      <div className="border-b border-[var(--border-soft)] pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-[var(--signal)]">About</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          Public narrative control
        </h1>
      </div>

      <div className="mt-8 orion-inset rounded-[28px] p-6">
        <div className="grid gap-4">
          <input
            value={data.title}
            onChange={(e) => setData((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
            className="orion-input"
            placeholder="Headline"
          />
          <input
            value={data.subtitle}
            onChange={(e) => setData((prev) => (prev ? { ...prev, subtitle: e.target.value } : prev))}
            className="orion-input"
            placeholder="Subtitle"
          />
          <textarea
            rows={5}
            value={data.paragraph1}
            onChange={(e) => setData((prev) => (prev ? { ...prev, paragraph1: e.target.value } : prev))}
            className="orion-input"
            placeholder="Paragraph 1"
          />
          <textarea
            rows={5}
            value={data.paragraph2}
            onChange={(e) => setData((prev) => (prev ? { ...prev, paragraph2: e.target.value } : prev))}
            className="orion-input"
            placeholder="Paragraph 2"
          />
          <textarea
            rows={5}
            value={data.paragraph3}
            onChange={(e) => setData((prev) => (prev ? { ...prev, paragraph3: e.target.value } : prev))}
            className="orion-input"
            placeholder="Paragraph 3"
          />

          {message && <p className="text-[var(--muted-strong)]">{message}</p>}

          <div>
            <button onClick={handleSave} disabled={saving} className="orion-button">
              {saving ? "Saving..." : "Save About content"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
