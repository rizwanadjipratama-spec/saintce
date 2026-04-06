"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"
import { formatCurrency } from "@/lib/utils"

interface RevenueByClient {
  client_id: string
  client_name: string
  total: number
  paid_count: number
}

interface RevenueByProject {
  project_id: string
  project_name: string
  client_name: string
  total: number
  paid_count: number
}

export default function AdminRevenuePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [byClient, setByClient] = useState<RevenueByClient[]>([])
  const [byProject, setByProject] = useState<RevenueByProject[]>([])
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      // Payments joined up to clients
      const { data: payments, error } = await supabase
        .from("payments")
        .select(`
          amount,
          invoice:invoices(
            subscription:subscriptions(
              service:services(
                project:projects(
                  id, name,
                  client:clients(id, name)
                )
              )
            )
          )
        `)
        .eq("status", "paid")

      if (error) throw error

      const clientMap = new Map<string, RevenueByClient>()
      const projectMap = new Map<string, RevenueByProject>()

      for (const payment of (payments ?? []) as Array<Record<string, unknown>>) {
        const amount = Number(payment.amount ?? 0)

        const inv = Array.isArray(payment.invoice) ? payment.invoice[0] : payment.invoice
        const sub = inv && typeof inv === "object" ? (Array.isArray((inv as Record<string,unknown>).subscription) ? ((inv as Record<string,unknown>).subscription as Record<string,unknown>[])[0] : (inv as Record<string,unknown>).subscription) : undefined
        const svc = sub && typeof sub === "object" ? (Array.isArray((sub as Record<string,unknown>).service) ? ((sub as Record<string,unknown>).service as Record<string,unknown>[])[0] : (sub as Record<string,unknown>).service) : undefined
        const proj = svc && typeof svc === "object" ? (Array.isArray((svc as Record<string,unknown>).project) ? ((svc as Record<string,unknown>).project as Record<string,unknown>[])[0] : (svc as Record<string,unknown>).project) : undefined
        const client = proj && typeof proj === "object" ? (Array.isArray((proj as Record<string,unknown>).client) ? ((proj as Record<string,unknown>).client as Record<string,unknown>[])[0] : (proj as Record<string,unknown>).client) : undefined

        if (!client || typeof client !== "object") continue
        const clientId = String((client as Record<string,unknown>).id ?? "")
        const clientName = String((client as Record<string,unknown>).name ?? "Unknown")
        const projectId = proj ? String((proj as Record<string,unknown>).id ?? "") : ""
        const projectName = proj ? String((proj as Record<string,unknown>).name ?? "Unknown") : "Unknown"

        // Aggregate by client
        const existing = clientMap.get(clientId)
        if (existing) {
          existing.total += amount
          existing.paid_count += 1
        } else {
          clientMap.set(clientId, { client_id: clientId, client_name: clientName, total: amount, paid_count: 1 })
        }

        // Aggregate by project
        if (projectId) {
          const existingProj = projectMap.get(projectId)
          if (existingProj) {
            existingProj.total += amount
            existingProj.paid_count += 1
          } else {
            projectMap.set(projectId, { project_id: projectId, project_name: projectName, client_name: clientName, total: amount, paid_count: 1 })
          }
        }
      }

      const clientList = Array.from(clientMap.values()).sort((a, b) => b.total - a.total)
      const projectList = Array.from(projectMap.values()).sort((a, b) => b.total - a.total)

      setByClient(clientList)
      setByProject(projectList)
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to load revenue data."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const init = async () => {
      const allowed = await hasAdminAccess()
      if (!allowed) { router.replace("/login"); return }
      if (active) await load()
    }
    void init()
    return () => { active = false }
  }, [load, router])

  const totalRevenue = byClient.reduce((s, c) => s + c.total, 0)
  const avgCLV = byClient.length > 0 ? totalRevenue / byClient.length : 0

  if (loading) return <div className="text-(--muted)">Loading revenue data...</div>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Analytics</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          Revenue
        </h1>
        <p className="mt-3 text-(--muted)">All-time paid revenue broken down by client and project.</p>
      </div>

      {message && <p className="mt-6 text-(--signal)">{message}</p>}

      {/* Totals */}
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="saintce-inset rounded-3xl p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-(--muted)">Total revenue (all-time)</p>
          <p className="mt-3 font-display text-4xl text-(--signal)">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="saintce-inset rounded-3xl p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-(--muted)">Avg. client lifetime value</p>
          <p className="mt-3 font-display text-4xl">{formatCurrency(avgCLV)}</p>
          <p className="mt-1 text-xs text-(--muted)">{byClient.length} client{byClient.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="saintce-inset rounded-3xl p-6">
          <p className="text-xs uppercase tracking-[0.16em] text-(--muted)">Highest value client</p>
          <p className="mt-3 font-display text-4xl">{byClient[0] ? formatCurrency(byClient[0].total) : "—"}</p>
          {byClient[0] && <p className="mt-1 text-xs text-(--muted)">{byClient[0].client_name}</p>}
        </div>
      </div>

      {/* Bar chart by client */}
      {byClient.length > 0 && (
        <section className="mt-8 saintce-inset rounded-[28px] p-6">
          <h2 className="font-display text-2xl">Revenue by client</h2>
          <div className="mt-6 space-y-4">
            {byClient.map((row) => {
              const pct = totalRevenue > 0 ? Math.round((row.total / totalRevenue) * 100) : 0
              return (
                <div key={row.client_id}>
                  <div className="mb-1 flex items-center justify-between gap-4">
                    <span className="text-sm text-(--text-primary)">{row.client_name}</span>
                    <span className="shrink-0 text-sm text-(--muted)">{formatCurrency(row.total)} <span className="text-xs">({pct}%)</span></span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-(--border-soft)">
                    <div
                      className="h-full rounded-full bg-(--signal) transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        {/* By client */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="font-display text-2xl">By client</h2>
          <div className="mt-5 space-y-3">
            {byClient.length === 0 ? (
              <p className="text-(--muted)">No paid payments recorded yet.</p>
            ) : byClient.map((row) => (
              <div key={row.client_id} className="flex items-center justify-between gap-4 rounded-[20px] border border-(--border-soft) px-4 py-4">
                <div>
                  <p className="text-(--text-primary)">{row.client_name}</p>
                  <p className="mt-1 text-xs text-(--muted)">{row.paid_count} payment{row.paid_count !== 1 ? "s" : ""}</p>
                </div>
                <p className="shrink-0 font-display text-xl">{formatCurrency(row.total)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* By project */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="font-display text-2xl">By project</h2>
          <div className="mt-5 space-y-3">
            {byProject.length === 0 ? (
              <p className="text-(--muted)">No paid payments recorded yet.</p>
            ) : byProject.map((row) => (
              <div key={row.project_id} className="flex items-center justify-between gap-4 rounded-[20px] border border-(--border-soft) px-4 py-4">
                <div>
                  <p className="text-(--text-primary)">{row.project_name}</p>
                  <p className="mt-1 text-xs text-(--muted)">{row.client_name} · {row.paid_count} payment{row.paid_count !== 1 ? "s" : ""}</p>
                </div>
                <p className="shrink-0 font-display text-xl">{formatCurrency(row.total)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
