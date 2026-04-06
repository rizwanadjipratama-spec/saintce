"use client"

import { supabase } from "@/lib/supabase"
import { getBillingOverview } from "@/lib/billing/service"
import type { BillingOverview } from "@/lib/billing/types"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"
import { formatCurrency } from "@/lib/utils"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

function formatEventLabel(value: string) {
  return value.replaceAll(".", " · ")
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export default function BillingOverviewPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [exporting, setExporting] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [overview, setOverview] = useState<BillingOverview | null>(null)

  const loadOverview = useCallback(async () => {
    try {
      const data = await getBillingOverview()
      setOverview(data)
      setMessage(null)
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load billing overview."))
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
      if (active) await loadOverview()
    }

    void init()
    return () => { active = false }
  }, [loadOverview, router])

  const handleExport = useCallback(async (type: "clients" | "invoices") => {
    setExporting(type)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error("Missing admin session token.")

      const response = await fetch(`/api/admin/export?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null
        throw new Error(payload?.error ?? `Export failed (${response.status})`)
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${type}-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setMessage(getErrorMessage(error, `Unable to export ${type}.`))
    } finally {
      setExporting(null)
    }
  }, [])

  const handleRunAutomation = useCallback(async () => {
    setRunning(true)
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token

      if (!token) throw new Error("Missing admin session token.")

      const response = await fetch("/api/billing/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ runAt: new Date().toISOString() }),
      })

      const payload = (await response.json().catch(() => null)) as {
        error?: string
        automation?: { invoicesGenerated: number; invoicesOverdue: number; subscriptionsSuspended: number }
        notifications?: { notificationsSent: number; skipped: number }
      } | null

      if (!response.ok) throw new Error(payload?.error || "Unable to run billing automation.")

      setMessage(
        `Automation complete — ${payload?.automation?.invoicesGenerated ?? 0} invoices generated, ` +
        `${payload?.automation?.invoicesOverdue ?? 0} marked overdue, ` +
        `${payload?.automation?.subscriptionsSuspended ?? 0} subscriptions suspended, ` +
        `${payload?.notifications?.notificationsSent ?? 0} notifications sent.`
      )
      await loadOverview()
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to run billing automation."))
    } finally {
      setRunning(false)
    }
  }, [loadOverview])

  if (loading || !overview) {
    return <div className="text-(--muted)">Loading billing overview...</div>
  }

  const statCards = [
    { label: "MRR", value: formatCurrency(overview.mrr), highlight: true },
    { label: "Revenue this month", value: formatCurrency(overview.monthlyRevenue) },
    { label: "Active subscriptions", value: overview.activeSubscriptions },
    { label: "Overdue invoices", value: overview.overdueInvoices },
    { label: "Suspended services", value: overview.suspendedServices },
    { label: "Total clients", value: overview.totalClients },
    { label: "Total projects", value: overview.totalProjects },
    { label: "Webhook failures", value: overview.stripeWebhookFailures },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-(--border-soft) pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Billing overview</p>
          <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
            Subscription revenue control
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => handleExport("clients")} disabled={exporting !== null} className="saintce-button--ghost">
            {exporting === "clients" ? "Exporting..." : "Export clients CSV"}
          </button>
          <button onClick={() => handleExport("invoices")} disabled={exporting !== null} className="saintce-button--ghost">
            {exporting === "invoices" ? "Exporting..." : "Export invoices CSV"}
          </button>
          <button onClick={handleRunAutomation} disabled={running} className="saintce-button">
            {running ? "Running..." : "Run billing automation"}
          </button>
        </div>
      </div>

      {message && <p className="mt-6 text-(--muted-strong)">{message}</p>}

      {/* Stat cards */}
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`saintce-inset rounded-3xl p-5${card.highlight ? " border border-(--signal)/20" : ""}`}
          >
            <p className="text-xs uppercase tracking-[0.16em] text-(--muted)">{card.label}</p>
            <p className={`mt-3 font-display text-4xl${card.highlight ? " text-(--signal)" : ""}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Payments + Invoices */}
      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="font-display text-2xl">Recent payments</h2>
          <div className="mt-5 space-y-3">
            {overview.recentPayments.length > 0 ? overview.recentPayments.map((payment) => (
              <div key={payment.id} className="rounded-[22px] border border-(--border-soft) px-4 py-4">
                <p className="text-(--text-primary)">{formatCurrency(payment.amount)}</p>
                <p className="mt-1 text-sm text-(--muted)">
                  {payment.invoice?.invoice_number ?? "Payment"} · {payment.payment_reference ?? "Manual reference"}
                </p>
              </div>
            )) : <p className="text-(--muted)">No payments recorded yet.</p>}
          </div>
        </section>

        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="font-display text-2xl">Recent invoices</h2>
          <div className="mt-5 space-y-3">
            {overview.recentInvoices.length > 0 ? overview.recentInvoices.map((invoice) => (
              <div key={invoice.id} className="rounded-[22px] border border-(--border-soft) px-4 py-4">
                <p className="text-(--text-primary)">{invoice.invoice_number}</p>
                <p className="mt-1 text-sm text-(--muted)">{formatCurrency(invoice.amount)} · {invoice.status} · due {invoice.due_date}</p>
              </div>
            )) : <p className="text-(--muted)">No invoices generated yet.</p>}
          </div>
        </section>
      </div>

      {/* Overdue Invoices + Suspended Subscriptions */}
      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="font-display text-2xl">Overdue invoices</h2>
          <p className="mt-1 text-sm text-(--muted)">Invoices past their due date awaiting payment.</p>
          <div className="mt-5 space-y-3">
            {overview.overdueInvoicesList.length > 0 ? overview.overdueInvoicesList.map((inv) => (
              <div key={inv.id} className="rounded-[22px] border border-(--signal)/20 bg-(--signal)/5 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-(--text-primary)">{inv.invoice_number}</p>
                    <p className="mt-1 text-sm text-(--muted)">{inv.client_name} · {inv.project_name}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-(--signal)">{formatCurrency(inv.amount)}</p>
                    <p className="mt-1 text-xs text-(--muted)">Due {inv.due_date}</p>
                  </div>
                </div>
              </div>
            )) : <p className="text-(--muted)">No overdue invoices. All clear.</p>}
          </div>
        </section>

        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="font-display text-2xl">Suspended subscriptions</h2>
          <p className="mt-1 text-sm text-(--muted)">Services blocked due to unpaid overdue invoices.</p>
          <div className="mt-5 space-y-3">
            {overview.suspendedSubscriptionsList.length > 0 ? overview.suspendedSubscriptionsList.map((sub) => (
              <div key={sub.id} className="rounded-[22px] border border-orange-500/20 bg-orange-500/5 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-(--text-primary)">{sub.service_name}</p>
                    <p className="mt-1 text-sm text-(--muted)">{sub.client_name} · {sub.project_name}</p>
                  </div>
                  {sub.suspended_at && (
                    <p className="shrink-0 text-xs text-(--muted)">
                      {new Date(sub.suspended_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )) : <p className="text-(--muted)">No suspended subscriptions.</p>}
          </div>
        </section>
      </div>

      {/* Automation Logs */}
      <section className="mt-8 saintce-inset rounded-[28px] p-6">
        <div className="flex flex-col gap-2 border-b border-(--border-soft) pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-2xl">Automation run log</h2>
            <p className="mt-1 text-sm text-(--muted)">History of billing automation runs. Cron fires daily at 01:00 UTC.</p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {overview.recentAutomationLogs.length > 0 ? overview.recentAutomationLogs.map((log) => (
            <div key={log.id} className="rounded-[22px] border border-(--border-soft) px-4 py-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-(--text-primary)">{new Date(log.run_at).toLocaleString()}</p>
                  <p className="mt-1 text-sm text-(--muted)">
                    {log.invoices_generated} generated · {log.invoices_overdue} overdue · {log.subscriptions_suspended} suspended · {log.notifications_sent} notified
                  </p>
                </div>
                <p className="shrink-0 text-sm text-(--muted)">{formatDuration(log.duration_ms)}</p>
              </div>
              {log.error_message && (
                <p className="mt-3 text-sm text-(--signal)">{log.error_message}</p>
              )}
            </div>
          )) : <p className="text-(--muted)">No automation runs recorded yet.</p>}
        </div>
      </section>

      {/* Stripe Webhook Activity */}
      <section className="mt-8 saintce-inset rounded-[28px] p-6">
        <div className="flex flex-col gap-2 border-b border-(--border-soft) pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-display text-2xl">Stripe webhook activity</h2>
            <p className="mt-1 text-sm text-(--muted)">Latest event processing state from the duplicate-safe webhook pipeline.</p>
          </div>
          <p className="text-sm text-(--muted)">Failed events: {overview.stripeWebhookFailures}</p>
        </div>
        <div className="mt-5 space-y-3">
          {overview.recentStripeEvents.length > 0 ? overview.recentStripeEvents.map((event) => (
            <div key={event.id} className="rounded-[22px] border border-(--border-soft) px-4 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-(--text-primary)">{formatEventLabel(event.event_type)}</p>
                  <p className="mt-1 font-mono text-xs uppercase tracking-[0.14em] text-(--muted)">{event.event_id}</p>
                </div>
                <div className="text-sm text-(--muted) md:text-right">
                  <p>{event.processing_status}</p>
                  <p className="mt-1">{event.livemode ? "live" : "test"} · {new Date(event.received_at).toLocaleString()}</p>
                </div>
              </div>
              {event.error_message && <p className="mt-3 text-sm text-(--signal)">{event.error_message}</p>}
            </div>
          )) : <p className="text-(--muted)">No Stripe webhook events recorded yet.</p>}
        </div>
      </section>
    </div>
  )
}
