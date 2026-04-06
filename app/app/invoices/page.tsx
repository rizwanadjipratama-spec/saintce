"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { getPortalSession } from "@/lib/portal/auth"
import { getPortalInvoices, type PortalInvoice } from "@/lib/portal/data"
import { formatCurrency } from "@/lib/utils"

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-500/12 text-emerald-200 border-emerald-400/25",
  issued: "bg-amber-500/12 text-amber-100 border-amber-400/25",
  overdue: "bg-rose-500/12 text-rose-100 border-rose-400/20",
  draft: "bg-white/8 text-white/70 border-white/12",
  void: "bg-white/8 text-white/50 border-white/10",
}

const FILTER_OPTIONS = ["all", "issued", "overdue", "paid"] as const
type FilterOption = (typeof FILTER_OPTIONS)[number]

export default function AppInvoicesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<PortalInvoice[]>([])
  const [filter, setFilter] = useState<FilterOption>("all")

  const load = useCallback(async () => {
    const session = await getPortalSession()
    if (!session) { router.replace("/login"); return }
    const data = await getPortalInvoices(session.clientId)
    setInvoices(data)
    setLoading(false)
  }, [router])

  useEffect(() => { void load() }, [load])

  const filtered = filter === "all" ? invoices : invoices.filter((inv) => inv.status === filter)
  const outstanding = invoices
    .filter((inv) => inv.status === "overdue" || inv.status === "issued")
    .reduce((sum, inv) => sum + inv.amount, 0)

  if (loading) return <p className="text-(--muted)">Loading invoices...</p>

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-(--border-soft) pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Client App</p>
          <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4rem)] leading-none tracking-[-0.04em]">
            Invoices
          </h1>
          {outstanding > 0 && (
            <p className="mt-3 text-(--muted)">
              Outstanding: <span className="text-(--signal)">{formatCurrency(outstanding)}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`saintce-button min-h-[36px] px-4 text-xs capitalize ${filter === opt ? "" : "saintce-button--ghost"}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {filtered.length > 0 ? (
          filtered.map((inv) => (
            <div
              key={inv.id}
              className="flex flex-col gap-3 rounded-[22px] border border-(--border-soft) px-4 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex items-center gap-3">
                  <p className="font-display text-xl text-(--text-primary)">{inv.invoice_number}</p>
                  <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.draft}`}>
                    {inv.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-(--muted)">{inv.project_name} · {inv.service_name}</p>
                <p className="mt-0.5 text-xs text-(--muted)">
                  Issued {inv.issue_date} · Due {inv.due_date}
                  {inv.paid_at && ` · Paid ${inv.paid_at.slice(0, 10)}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-display text-2xl">{formatCurrency(inv.amount)}</p>
                {(inv.status === "issued" || inv.status === "overdue") && (
                  <Link href={`/app/invoices/${inv.id}`} className="saintce-button min-h-[38px] px-5 text-sm">
                    Pay now
                  </Link>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-(--muted)">No invoices found for this filter.</p>
        )}
      </div>
    </div>
  )
}
