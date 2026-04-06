"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"
import { formatCurrency } from "@/lib/utils"

interface DashboardStats {
  totalClients: number
  activeSubscriptions: number
  overdueInvoices: number
  openTickets: number
  mrr: number
  totalRevenue: number
}

interface RecentPayment {
  id: string
  amount: number
  paid_at: string | null
  invoice: { invoice_number: string } | null
}

interface RecentTicket {
  id: string
  subject: string
  status: string
  priority: string
  client: { name: string } | null
  updated_at: string
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: "text-(--signal)",
  high: "text-amber-400",
  normal: "text-(--text-primary)",
  low: "text-(--muted)",
}

const STATUS_COLOR: Record<string, string> = {
  open: "text-emerald-400",
  in_progress: "text-blue-400",
  waiting: "text-amber-400",
  resolved: "text-(--muted)",
  closed: "text-(--muted)",
}

export default function AdminOverviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([])
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    try {
      const [
        clientsRes,
        subsRes,
        overdueRes,
        ticketsRes,
        paymentsRes,
        mrrRes,
        totalRevenueRes,
      ] = await Promise.all([
        supabase.from("clients").select("id", { count: "exact", head: true }).is("deleted_at", null),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("status", "overdue"),
        supabase.from("tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress", "waiting"]),
        supabase.from("payments").select("id, amount, paid_at, invoice:invoices(invoice_number)").eq("status", "paid").order("paid_at", { ascending: false }).limit(5),
        supabase.from("subscriptions").select("price, billing_interval").eq("status", "active"),
        supabase.from("payments").select("amount").eq("status", "paid"),
      ])

      const mrrData = (mrrRes.data ?? []) as Array<{ price: number; billing_interval: string }>
      const mrr = mrrData.reduce((s, sub) => s + (sub.billing_interval === "yearly" ? sub.price / 12 : sub.price), 0)
      const totalRevenue = ((totalRevenueRes.data ?? []) as Array<{ amount: number }>).reduce((s, p) => s + p.amount, 0)

      setStats({
        totalClients: clientsRes.count ?? 0,
        activeSubscriptions: subsRes.count ?? 0,
        overdueInvoices: overdueRes.count ?? 0,
        openTickets: ticketsRes.count ?? 0,
        mrr,
        totalRevenue,
      })

      setRecentPayments((paymentsRes.data ?? []) as unknown as RecentPayment[])

      // Load recent tickets with client join
      const { data: ticketRows } = await supabase
        .from("tickets")
        .select("id, subject, status, priority, client:clients(name), updated_at")
        .in("status", ["open", "in_progress", "waiting"])
        .order("updated_at", { ascending: false })
        .limit(5)

      setRecentTickets((ticketRows ?? []) as unknown as RecentTicket[])
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load dashboard."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const init = async () => {
      const allowed = await hasAdminAccess()
      if (!allowed) { router.replace("/login"); return }
      if (active) await loadDashboard()
    }
    void init()
    return () => { active = false }
  }, [loadDashboard, router])

  if (loading) return <div className="text-(--muted)">Loading Saintce Control...</div>

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-(--border-soft) pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Overview</p>
          <h1 className="mt-4 font-display text-[clamp(2.5rem,5vw,4.8rem)] leading-none tracking-[-0.04em]">
            Saintce Control
          </h1>
          <p className="mt-4 max-w-2xl text-(--muted)">
            Command center — billing, clients, support, and system health.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/admin/billing-overview" className="saintce-button saintce-button--ghost">Billing</Link>
          <Link href="/admin/tickets" className="saintce-button">Tickets</Link>
        </div>
      </div>

      {error && <p className="mt-6 text-(--signal)">{error}</p>}

      {/* Stat cards */}
      {stats && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[
            { label: "Total clients", value: stats.totalClients, href: "/admin/clients" },
            { label: "Active subscriptions", value: stats.activeSubscriptions, href: "/admin/subscriptions" },
            { label: "MRR", value: formatCurrency(stats.mrr), href: "/admin/billing-overview" },
            { label: "Total revenue", value: formatCurrency(stats.totalRevenue), href: "/admin/revenue" },
            {
              label: "Overdue invoices",
              value: stats.overdueInvoices,
              href: "/admin/billing-overview",
              alert: stats.overdueInvoices > 0,
            },
            {
              label: "Open tickets",
              value: stats.openTickets,
              href: "/admin/tickets",
              alert: stats.openTickets > 0,
            },
          ].map((card) => (
            <Link key={card.label} href={card.href} className="saintce-inset block rounded-3xl p-5 transition hover:border-(--signal)">
              <p className="text-xs uppercase tracking-[0.18em] text-(--muted)">{card.label}</p>
              <p className={`mt-4 font-display text-4xl ${card.alert ? "text-(--signal)" : "text-(--text-primary)"}`}>
                {card.value}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        {/* Recent payments */}
        <section className="saintce-inset rounded-[28px] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl">Recent payments</h2>
            <Link href="/admin/payments" className="text-sm text-(--muted) hover:text-(--text-primary) transition">View all</Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="text-(--muted)">No payments yet.</p>
          ) : (
            <div className="space-y-3">
              {recentPayments.map((p) => {
                const inv = p.invoice && typeof p.invoice === "object" ? p.invoice as Record<string, unknown> : null
                return (
                  <div key={p.id} className="flex items-center justify-between gap-4 rounded-[20px] border border-(--border-soft) px-4 py-3">
                    <div>
                      <p className="text-sm text-(--text-primary)">{inv ? String(inv.invoice_number ?? "") : "—"}</p>
                      <p className="mt-0.5 text-xs text-(--muted)">
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <p className="shrink-0 font-display text-xl text-emerald-400">{formatCurrency(p.amount)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Open tickets */}
        <section className="saintce-inset rounded-[28px] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-2xl">Open tickets</h2>
            <Link href="/admin/tickets" className="text-sm text-(--muted) hover:text-(--text-primary) transition">View all</Link>
          </div>
          {recentTickets.length === 0 ? (
            <p className="text-(--muted)">No open tickets. All clear.</p>
          ) : (
            <div className="space-y-3">
              {recentTickets.map((t) => {
                const client = t.client && typeof t.client === "object" ? t.client as Record<string, unknown> : null
                return (
                  <Link
                    key={t.id}
                    href="/admin/tickets"
                    className="block rounded-[20px] border border-(--border-soft) px-4 py-3 transition hover:border-(--signal)"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-(--text-primary)">{t.subject}</p>
                        <p className="mt-0.5 text-xs text-(--muted)">{client ? String(client.name ?? "") : "Unknown"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-xs font-mono uppercase ${STATUS_COLOR[t.status] ?? "text-(--muted)"}`}>{t.status.replace("_", " ")}</p>
                        <p className={`mt-0.5 text-xs ${PRIORITY_COLOR[t.priority] ?? ""}`}>{t.priority}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Quick links */}
      <section className="mt-8 saintce-inset rounded-[28px] p-6">
        <h2 className="mb-5 font-display text-2xl">Quick access</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Billing overview", href: "/admin/billing-overview", desc: "MRR, overdue, suspended" },
            { label: "Revenue report", href: "/admin/revenue", desc: "Total revenue + CLV" },
            { label: "System logs", href: "/admin/system-logs", desc: "Cron, webhooks, retries" },
            { label: "Adjustments", href: "/admin/adjustments", desc: "Credit notes + adjustments" },
            { label: "Email logs", href: "/admin/email-logs", desc: "All outbound emails" },
            { label: "Activity log", href: "/admin/activity", desc: "Full audit trail" },
            { label: "File manager", href: "/admin/files", desc: "Client file storage" },
            { label: "Deployment", href: "/admin/deployment", desc: "Production checklist" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[20px] border border-(--border-soft) px-4 py-4 transition hover:border-(--signal)"
            >
              <p className="text-sm text-(--text-primary)">{link.label}</p>
              <p className="mt-1 text-xs text-(--muted)">{link.desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
