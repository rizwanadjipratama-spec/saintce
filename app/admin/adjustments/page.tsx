"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"
import { formatCurrency } from "@/lib/utils"

interface SubOption {
  id: string
  label: string
}

interface AdjustmentRow {
  id: string
  invoice_number: string
  amount: number
  invoice_type: string
  status: string
  issue_date: string
  due_date: string
}

const today = new Date().toISOString().slice(0, 10)
const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

export default function AdminAdjustmentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [subs, setSubs] = useState<SubOption[]>([])
  const [adjustments, setAdjustments] = useState<AdjustmentRow[]>([])

  const [form, setForm] = useState({
    subscription_id: "",
    amount: 0,
    invoice_type: "adjustment" as "adjustment" | "credit_note",
    issue_date: today,
    due_date: inSevenDays,
  })

  const loadData = useCallback(async () => {
    try {
      // Load subscriptions for the dropdown
      const { data: subRows, error: subErr } = await supabase
        .from("subscriptions")
        .select("id, service:services(name, project:projects(name, client:clients(name)))")
        .in("status", ["active", "suspended", "past_due"])
        .limit(200)

      if (subErr) throw subErr

      const options: SubOption[] = ((subRows ?? []) as Array<Record<string, unknown>>).map((row) => {
        const svc = Array.isArray(row.service) ? row.service[0] : row.service
        const svcR = svc as Record<string, unknown> | null
        const proj = svcR ? (Array.isArray(svcR.project) ? (svcR.project as Record<string, unknown>[])[0] : svcR.project as Record<string, unknown>) : null
        const client = proj ? (Array.isArray(proj.client) ? (proj.client as Record<string, unknown>[])[0] : proj.client as Record<string, unknown>) : null
        const clientName = client ? String(client.name ?? "Unknown") : "Unknown"
        const projName = proj ? String(proj.name ?? "") : ""
        const svcName = svcR ? String(svcR.name ?? "") : "Service"
        return { id: String(row.id), label: `${clientName} — ${projName} / ${svcName}` }
      })
      setSubs(options)

      // Load adjustment/credit invoices
      const { data: adjRows, error: adjErr } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, invoice_type, status, issue_date, due_date")
        .in("invoice_type", ["adjustment", "credit_note"])
        .order("issue_date", { ascending: false })
        .limit(100)

      if (adjErr) throw adjErr
      setAdjustments((adjRows ?? []) as AdjustmentRow[])
      setMessage(null)
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to load data."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const init = async () => {
      const allowed = await hasAdminAccess()
      if (!allowed) { router.replace("/login"); return }
      if (active) await loadData()
    }
    void init()
    return () => { active = false }
  }, [loadData, router])

  const handleSubmit = useCallback(async () => {
    if (!form.subscription_id) { setMessage("Select a subscription."); return }
    setSaving(true)
    try {
      const { data, error } = await supabase.rpc("create_adjustment_invoice", {
        p_subscription_id: form.subscription_id,
        p_amount: form.amount,
        p_issue_date: form.issue_date,
        p_due_date: form.due_date,
        p_invoice_type: form.invoice_type,
      })
      if (error) throw error
      setMessage(`${form.invoice_type === "credit_note" ? "Credit note" : "Adjustment invoice"} created (ID: ${String(data)}).`)
      setForm({ subscription_id: "", amount: 0, invoice_type: "adjustment", issue_date: today, due_date: inSevenDays })
      await loadData()
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to create adjustment."))
    } finally {
      setSaving(false)
    }
  }, [form, loadData])

  if (loading) return <div className="text-(--muted)">Loading adjustments...</div>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Billing</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          Adjustments
        </h1>
        <p className="mt-3 text-(--muted)">Manual adjustment invoices and credit notes for subscription billing.</p>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        {/* Create form */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="mb-5 font-display text-xl">Create adjustment</h2>
          <div className="grid gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Type</label>
              <select
                value={form.invoice_type}
                onChange={(e) => setForm((p) => ({ ...p, invoice_type: e.target.value as "adjustment" | "credit_note" }))}
                className="saintce-input"
              >
                <option value="adjustment">Adjustment (ADJ-)</option>
                <option value="credit_note">Credit note (ADJ-)</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Subscription</label>
              <select
                value={form.subscription_id}
                onChange={(e) => setForm((p) => ({ ...p, subscription_id: e.target.value }))}
                className="saintce-input"
              >
                <option value="">Select subscription</option>
                {subs.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Amount (use negative for credit)</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))}
                className="saintce-input"
                placeholder="e.g. -50 for credit, 100 for debit"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-(--muted)">Issue date</label>
                <input type="date" value={form.issue_date} onChange={(e) => setForm((p) => ({ ...p, issue_date: e.target.value }))} className="saintce-input" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-(--muted)">Due date</label>
                <input type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} className="saintce-input" />
              </div>
            </div>
            {message && <p className="text-(--muted-strong)">{message}</p>}
            <button onClick={handleSubmit} disabled={saving} className="saintce-button">
              {saving ? "Creating..." : "Create adjustment"}
            </button>
          </div>
        </section>

        {/* Adjustment list */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="mb-5 font-display text-xl">History</h2>
          {adjustments.length === 0 ? (
            <p className="text-(--muted)">No adjustments yet.</p>
          ) : (
            <div className="space-y-3">
              {adjustments.map((adj) => (
                <div key={adj.id} className="flex items-center justify-between gap-4 rounded-[20px] border border-(--border-soft) px-4 py-4">
                  <div>
                    <p className="font-mono text-sm text-(--text-primary)">{adj.invoice_number}</p>
                    <p className="mt-1 text-xs text-(--muted)">
                      {adj.invoice_type} · {adj.status} · {adj.issue_date}
                    </p>
                  </div>
                  <p className={`shrink-0 font-display text-xl ${adj.amount < 0 ? "text-emerald-400" : ""}`}>
                    {formatCurrency(adj.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
