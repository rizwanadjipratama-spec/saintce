"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { getPortalSession } from "@/lib/portal/auth"
import { getPortalInvoiceById, type PortalInvoice } from "@/lib/portal/data"
import { supabase } from "@/lib/supabase"
import { formatCurrency } from "@/lib/utils"

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-emerald-500/12 text-emerald-200 border-emerald-400/25",
  issued: "bg-amber-500/12 text-amber-100 border-amber-400/25",
  overdue: "bg-rose-500/12 text-rose-100 border-rose-400/20",
  draft: "bg-white/8 text-white/70 border-white/12",
  void: "bg-white/8 text-white/50 border-white/10",
}

export default function PortalInvoiceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = typeof params.id === "string" ? params.id : null

  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [invoice, setInvoice] = useState<PortalInvoice | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!invoiceId) {
      router.replace("/portal/invoices")
      return
    }

    const session = await getPortalSession()

    if (!session) {
      router.replace("/portal/login")
      return
    }

    const data = await getPortalInvoiceById(invoiceId)

    if (!data) {
      router.replace("/portal/invoices")
      return
    }

    setInvoice(data)
    setLoading(false)
  }, [invoiceId, router])

  useEffect(() => {
    void load()
  }, [load])

  const handlePay = useCallback(async () => {
    if (!invoice || !invoiceId) return

    setError(null)
    setPaying(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token

      if (!token) {
        throw new Error("Session expired. Please sign in again.")
      }

      const response = await fetch("/api/portal/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invoiceId }),
      })

      const payload = (await response.json().catch(() => null)) as {
        url?: string
        error?: string
      } | null

      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? "Unable to create payment session.")
      }

      window.location.href = payload.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
      setPaying(false)
    }
  }, [invoice, invoiceId])

  if (loading || !invoice) {
    return <p className="text-[var(--muted)]">Loading invoice...</p>
  }

  const canPay = invoice.status === "issued" || invoice.status === "overdue"

  return (
    <div className="mx-auto max-w-[680px]">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          href="/portal/invoices"
          className="text-sm text-[var(--muted-strong)] transition-colors hover:text-[var(--text-primary)]"
        >
          ← All invoices
        </Link>
        <Link
          href={`/portal/invoices/${invoiceId}/print`}
          target="_blank"
          rel="noopener noreferrer"
          className="saintce-button saintce-button--ghost min-h-[36px] px-4 text-sm"
        >
          Print / PDF
        </Link>
      </div>

      <div className="saintce-panel p-6 md:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-soft)] pb-6">
          <div>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-[var(--muted)]">
              Invoice
            </p>
            <h1 className="mt-2 font-display text-3xl text-[var(--text-primary)]">
              {invoice.invoice_number}
            </h1>
          </div>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${STATUS_STYLES[invoice.status] ?? STATUS_STYLES.draft}`}
          >
            {invoice.status}
          </span>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {[
            { label: "Project", value: invoice.project_name },
            { label: "Service", value: invoice.service_name },
            { label: "Issue date", value: invoice.issue_date },
            { label: "Due date", value: invoice.due_date },
            ...(invoice.paid_at ? [{ label: "Paid at", value: invoice.paid_at.slice(0, 10) }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="saintce-inset rounded-[18px] p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{label}</p>
              <p className="mt-2 text-[var(--text-primary)]">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-end justify-between border-t border-[var(--border-soft)] pt-6">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">Total amount</p>
            <p className="mt-2 font-display text-[clamp(2.2rem,4vw,3rem)] leading-none tracking-[-0.04em]">
              {formatCurrency(invoice.amount)}
            </p>
          </div>

          {canPay && (
            <button
              onClick={handlePay}
              disabled={paying}
              className="saintce-button"
            >
              {paying ? "Redirecting..." : "Pay with Stripe"}
            </button>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-[var(--signal)]">{error}</p>
        )}

        {invoice.status === "paid" && (
          <div className="mt-6 rounded-[18px] border border-emerald-400/25 bg-emerald-500/10 px-4 py-4">
            <p className="text-sm text-emerald-200">
              This invoice has been paid. Thank you!
            </p>
          </div>
        )}

        {invoice.status === "overdue" && (
          <div className="mt-6 rounded-[18px] border border-rose-400/20 bg-rose-500/8 px-4 py-4">
            <p className="text-sm text-rose-200">
              This invoice is overdue. Please pay as soon as possible to avoid service suspension.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
