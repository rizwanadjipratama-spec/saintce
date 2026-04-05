"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { siteConfig } from "@/lib/site-config"

interface ContactFormState {
  name: string
  email: string
  company: string
  website: string
  timeline: string
  budget: string
  overview: string
}

const INITIAL_FORM: ContactFormState = {
  name: "",
  email: "",
  company: "",
  website: "",
  timeline: "",
  budget: "",
  overview: "",
}

export default function ContactForm() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<ContactFormState>(INITIAL_FORM)

  const mountedRef = useRef(true)
  const submitInFlightRef = useRef(false)
  const redirectTimerRef = useRef<number | null>(null)

  const clearRedirectTimer = useCallback(() => {
    if (redirectTimerRef.current !== null) {
      window.clearTimeout(redirectTimerRef.current)
      redirectTimerRef.current = null
    }
  }, [])

  const handleFieldChange = useCallback((field: keyof ContactFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleBack = useCallback(() => {
    if (loading || submitInFlightRef.current || success) {
      return
    }

    router.back()
  }, [loading, router, success])

  const handleSubmit = useCallback(async () => {
    if (loading || submitInFlightRef.current || success) {
      return
    }

    if (!form.name.trim() || !form.email.trim() || !form.overview.trim()) {
      setError("Name, email, and overview are required.")
      return
    }

    submitInFlightRef.current = true
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string } | null

      if (!response.ok) {
        setError(payload?.error || "Unable to send inquiry.")
        return
      }

      if (!mountedRef.current) {
        return
      }

      setSuccess(true)
      clearRedirectTimer()
      redirectTimerRef.current = window.setTimeout(() => {
        if (mountedRef.current) {
          router.push("/")
        }
      }, 1400)
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Unexpected error.")
    } finally {
      submitInFlightRef.current = false

      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [clearRedirectTimer, form, loading, router, success])

  useEffect(() => {
    return () => {
      mountedRef.current = false
      submitInFlightRef.current = false
      clearRedirectTimer()
    }
  }, [clearRedirectTimer])

  return (
    <div className="mx-auto max-w-[880px]">
      <div className="orion-panel p-6 md:p-10">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-[var(--signal)]">Inquiry</p>
            <h1 className="mt-5 font-display text-[clamp(2.4rem,5vw,4.6rem)] leading-[1.02] tracking-[-0.04em] text-[var(--text-primary)]">
              Start an Orion deployment.
            </h1>
            <p className="mt-5 text-[0.98rem] leading-[1.8] text-[var(--muted)]">
              Use this form for website rebuilds, admin control surfaces, or a broader Orion rollout.
            </p>
            <div className="orion-inset mt-8 rounded-[26px] p-5">
              <p className="text-sm uppercase tracking-[0.16em] text-[var(--muted)]">Direct line</p>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="mt-2 block text-lg text-[var(--text-primary)]"
              >
                {siteConfig.contact.email}
              </a>
            </div>
          </div>

          <div className="grid gap-4">
            <input
              placeholder="Name *"
              value={form.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              className="orion-input"
            />
            <input
              placeholder="Email *"
              value={form.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              className="orion-input"
            />
            <input
              placeholder="Company"
              value={form.company}
              onChange={(e) => handleFieldChange("company", e.target.value)}
              className="orion-input"
            />
            <input
              placeholder="Website"
              value={form.website}
              onChange={(e) => handleFieldChange("website", e.target.value)}
              className="orion-input"
            />
            <div className="grid gap-4 md:grid-cols-2">
              <input
                placeholder="Timeline"
                value={form.timeline}
                onChange={(e) => handleFieldChange("timeline", e.target.value)}
                className="orion-input"
              />
              <input
                placeholder="Budget"
                value={form.budget}
                onChange={(e) => handleFieldChange("budget", e.target.value)}
                className="orion-input"
              />
            </div>
            <textarea
              placeholder="Project overview *"
              rows={6}
              value={form.overview}
              onChange={(e) => handleFieldChange("overview", e.target.value)}
              className="orion-input min-h-[180px]"
            />

            {(error || success) && (
              <p className={success ? "text-emerald-200" : "text-rose-200"}>
                {success ? "Inquiry sent. Redirecting to home..." : error}
              </p>
            )}

            <div className="flex flex-wrap gap-4 pt-2">
              <button onClick={handleSubmit} disabled={loading || success} className="orion-button">
                {loading ? "Sending..." : success ? "Sent" : "Send inquiry"}
              </button>
              <button
                onClick={handleBack}
                className="orion-button orion-button--ghost"
                disabled={loading || success}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
