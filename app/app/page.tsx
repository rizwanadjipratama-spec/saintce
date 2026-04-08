"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getPortalSession } from "@/lib/portal/auth"
import { getPortalSummary, getPortalInvoices, type PortalSummary, type PortalInvoice } from "@/lib/portal/data"
import { formatCurrency } from "@/lib/utils"

const INVOICE_STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-500/12 text-emerald-200 border-emerald-400/25",
  issued: "bg-amber-500/12 text-amber-100 border-amber-400/25",
  overdue: "bg-rose-500/12 text-rose-100 border-rose-400/20",
  draft: "bg-white/8 text-white/70 border-white/12",
  void: "bg-white/8 text-white/50 border-white/10",
}

export default function AppDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<PortalSummary | null>(null)
  const [recentInvoices, setRecentInvoices] = useState<PortalInvoice[]>([])
  const [clientName, setClientName] = useState("")

  const load = useCallback(async () => {
    const session = await getPortalSession()
    if (!session) { router.replace("/login"); return }
    setClientName(session.clientName)
    const [summaryData, invoices] = await Promise.all([
      getPortalSummary(session.clientId),
      getPortalInvoices(session.clientId),
    ])
    setSummary(summaryData)
    setRecentInvoices(invoices.slice(0, 4))
    setLoading(false)
  }, [router])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [load])

  if (loading || !summary) {
    return <p className="text-(--muted)">Loading dashboard...</p>
  }

  const stats = [
    { label: "Projects", value: summary.totalProjects },
    { label: "Active subscriptions", value: summary.activeSubscriptions },
    { label: "Overdue invoices", value: summary.overdueInvoices },
    { label: "Outstanding balance", value: formatCurrency(summary.totalOutstanding) },
  ]

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">
          Client App
        </p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4rem)] leading-none tracking-[-0.04em]">
          Welcome, {clientName}
        </h1>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="saintce-inset rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-(--muted)">{stat.label}</p>
            <p className="mt-3 font-display text-4xl">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="mt-10 saintce-inset rounded-[28px] p-6">
        <div className="flex items-end justify-between border-b border-(--border-soft) pb-4">
          <h2 className="font-display text-2xl">Recent invoices</h2>
          <Link href="/app/invoices" className="text-sm text-(--muted-strong) transition-colors hover:text-(--text-primary)">
            View all
          </Link>
        </div>

        <div className="mt-5 space-y-3">
          {recentInvoices.length > 0 ? (
            recentInvoices.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col gap-3 rounded-[22px] border border-(--border-soft) px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-(--text-primary)">{inv.invoice_number}</p>
                  <p className="mt-1 text-sm text-(--muted)">
                    {inv.project_name} · {inv.service_name} · due {inv.due_date}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-display text-xl">{formatCurrency(inv.amount)}</p>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${INVOICE_STATUS_STYLES[inv.status] ?? INVOICE_STATUS_STYLES.draft}`}
                  >
                    {inv.status}
                  </span>
                  {(inv.status === "issued" || inv.status === "overdue") && (
                    <Link href={`/app/invoices/${inv.id}`} className="saintce-button min-h-[34px] px-4 text-xs">
                      Pay
                    </Link>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-(--muted)">No invoices yet.</p>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
        {[
          { label: "Projects", href: "/app/projects", description: "View all your active and suspended projects." },
          { label: "Subscriptions", href: "/app/subscriptions", description: "Check subscription status and billing cycles." },
          { label: "Invoices", href: "/app/invoices", description: "View, pay, and track all your invoices." },
          { label: "Payments", href: "/app/payments", description: "Full history of all payments made." },
          { label: "Support", href: "/app/tickets", description: "Open a support ticket or check existing requests." },
          { label: "Files", href: "/app/files", description: "Upload and access documents and contracts." },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="saintce-panel saintce-panel--inset block p-6 transition-transform duration-300 hover:-translate-y-1"
          >
            <p className="font-display text-2xl text-(--text-primary)">{item.label}</p>
            <p className="mt-3 text-sm leading-[1.7] text-(--muted)">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
