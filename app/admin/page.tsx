"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { fetchAboutSection } from "@/lib/about"
import { fetchClients, summarizeClients, type Client } from "@/lib/clients"
import { hasAdminAccess } from "@/lib/admin-auth"

export default function AdminOverviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [aboutReady, setAboutReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    try {
      const [clientRows, about] = await Promise.all([
        fetchClients({ includeArchived: true }),
        fetchAboutSection(),
      ])

      setClients(clientRows)
      setAboutReady(Boolean(about?.title || about?.paragraph1 || about?.paragraph2 || about?.paragraph3))
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.")
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
        await loadDashboard()
      }
    }

    void init()

    return () => {
      active = false
    }
  }, [loadDashboard, router])

  const summary = useMemo(() => summarizeClients(clients), [clients])
  const recentClients = clients.slice(0, 5)

  if (loading) {
    return <div className="text-[var(--muted)]">Loading Saintce Control...</div>
  }

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-[var(--border-soft)] pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-[var(--signal)]">Overview</p>
          <h1 className="mt-4 font-display text-[clamp(2.5rem,5vw,4.8rem)] leading-none tracking-[-0.04em]">
            Saintce Control
          </h1>
          <p className="mt-4 max-w-2xl text-[var(--muted)]">
            This panel is now the command center for the website, client registry, and live About content.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/admin/sections" className="saintce-button saintce-button--ghost">
            Edit sections
          </Link>
          <Link href="/admin/clients" className="saintce-button">
            Manage clients
          </Link>
          <Link href="/admin/about" className="saintce-button saintce-button--ghost">
            Edit about
          </Link>
        </div>
      </div>

      {error && <p className="mt-6 text-rose-200">{error}</p>}

      <div className="mt-8 grid gap-5 xl:grid-cols-4">
        {[
          { label: "Total clients", value: summary.total },
          { label: "Live clients", value: summary.live },
          { label: "Private clients", value: summary.private },
          { label: "About content", value: aboutReady ? "Live" : "Draft" },
        ].map((card) => (
          <div key={card.label} className="saintce-inset rounded-[24px] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-4 font-display text-4xl text-[var(--text-primary)]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="saintce-inset rounded-[28px] p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-[var(--text-primary)]">Recent clients</h2>
            <Link href="/admin/clients" className="text-sm text-[var(--muted-strong)]">
              Open full manager
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {recentClients.length > 0 ? (
              recentClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between rounded-[20px] border border-[var(--border-soft)] px-4 py-4"
                >
                  <div>
                    <p className="text-[var(--text-primary)]">{client.name}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{client.category || "Uncategorized"}</p>
                  </div>
                  <span className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs uppercase tracking-[0.16em] text-[var(--muted-strong)]">
                    {client.status}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-[var(--muted)]">No clients in the registry yet.</p>
            )}
          </div>
        </section>

        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="font-display text-2xl text-[var(--text-primary)]">Refactor wins</h2>
          <div className="mt-6 space-y-4 text-[0.98rem] leading-[1.8] text-[var(--muted)]">
            <p>Branding is centralized under Saintce instead of being split across multiple legacy names.</p>
            <p>Client data access is shared through one library, reducing duplicate query logic across public and admin surfaces.</p>
            <p>Old dashboard duplication is removed so admin behavior has one obvious place to evolve from here.</p>
          </div>
        </section>
      </div>
    </div>
  )
}
