"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"
import { formatCurrency } from "@/lib/utils"

interface PaymentOption {
  id: string
  label: string
  amount: number
}

interface RefundRow {
  id: string
  amount: number
  reason: string | null
  status: string
  refunded_at: string | null
  created_at: string
  payment: { amount: number; invoice: { invoice_number: string } | null } | null
}

const today = new Date().toISOString().slice(0, 10)

export default function AdminRefundsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [payments, setPayments] = useState<PaymentOption[]>([])
  const [refunds, setRefunds] = useState<RefundRow[]>([])

  const [form, setForm] = useState({
    payment_id: "",
    amount: 0,
    reason: "",
    refunded_at: today,
  })

  const loadData = useCallback(async () => {
    try {
      const [paymentsRes, refundsRes] = await Promise.all([
        supabase
          .from("payments")
          .select("id, amount, invoice:invoices(invoice_number)")
          .eq("status", "paid")
          .order("paid_at", { ascending: false })
          .limit(200),
        supabase
          .from("refunds")
          .select("id, amount, reason, status, refunded_at, created_at, payment:payments(amount, invoice:invoices(invoice_number))")
          .order("created_at", { ascending: false })
          .limit(100),
      ])

      if (paymentsRes.error) throw paymentsRes.error
      if (refundsRes.error) throw refundsRes.error

      const opts: PaymentOption[] = ((paymentsRes.data ?? []) as Array<Record<string, unknown>>).map((p) => {
        const inv = Array.isArray(p.invoice) ? p.invoice[0] : p.invoice
        const invNum = inv && typeof inv === "object" ? String((inv as Record<string, unknown>).invoice_number ?? "") : ""
        return {
          id: String(p.id),
          label: invNum ? `${invNum} — ${formatCurrency(Number(p.amount))}` : `Payment ${formatCurrency(Number(p.amount))}`,
          amount: Number(p.amount),
        }
      })

      setPayments(opts)
      setRefunds((refundsRes.data ?? []) as unknown as RefundRow[])
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
    if (!form.payment_id) { setMessage("Select a payment."); return }
    if (form.amount <= 0) { setMessage("Amount must be greater than 0."); return }
    setSaving(true)
    try {
      const { error } = await supabase.from("refunds").insert({
        payment_id: form.payment_id,
        amount: form.amount,
        reason: form.reason || null,
        status: "processed",
        refunded_at: form.refunded_at ? new Date(form.refunded_at).toISOString() : new Date().toISOString(),
      })
      if (error) throw error
      setMessage("Refund recorded.")
      setForm({ payment_id: "", amount: 0, reason: "", refunded_at: today })
      await loadData()
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to record refund."))
    } finally {
      setSaving(false)
    }
  }, [form, loadData])

  if (loading) return <div className="text-(--muted)">Loading refunds...</div>

  const selectedPayment = payments.find((p) => p.id === form.payment_id)

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Billing</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          Refunds
        </h1>
        <p className="mt-3 text-(--muted)">Record refunds against paid invoices.</p>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        {/* Create form */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="mb-5 font-display text-xl">Record refund</h2>
          <div className="grid gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Payment</label>
              <select
                value={form.payment_id}
                onChange={(e) => {
                  const p = payments.find((x) => x.id === e.target.value)
                  setForm((f) => ({ ...f, payment_id: e.target.value, amount: p?.amount ?? 0 }))
                }}
                className="saintce-input"
              >
                <option value="">Select payment</option>
                {payments.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            {selectedPayment && (
              <p className="text-xs text-(--muted)">Max refundable: {formatCurrency(selectedPayment.amount)}</p>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Refund amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value || 0) }))}
                className="saintce-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Reason (optional)</label>
              <input
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Client request, duplicate charge..."
                className="saintce-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Refund date</label>
              <input
                type="date"
                value={form.refunded_at}
                onChange={(e) => setForm((f) => ({ ...f, refunded_at: e.target.value }))}
                className="saintce-input"
              />
            </div>
            {message && <p className="text-(--muted-strong)">{message}</p>}
            <button onClick={handleSubmit} disabled={saving} className="saintce-button">
              {saving ? "Recording..." : "Record refund"}
            </button>
          </div>
        </section>

        {/* Refund list */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="mb-5 font-display text-xl">History</h2>
          {refunds.length === 0 ? (
            <p className="text-(--muted)">No refunds recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {refunds.map((r) => {
                const pay = r.payment && typeof r.payment === "object" ? r.payment as Record<string, unknown> : null
                const inv = pay?.invoice && typeof pay.invoice === "object" ? pay.invoice as Record<string, unknown> : null
                return (
                  <div key={r.id} className="flex items-center justify-between gap-4 rounded-[20px] border border-(--border-soft) px-4 py-4">
                    <div>
                      {inv && <p className="font-mono text-sm text-(--text-primary)">{String(inv.invoice_number ?? "")}</p>}
                      {r.reason && <p className="mt-1 text-xs text-(--muted)">{r.reason}</p>}
                      <p className="mt-1 text-xs text-(--muted)">
                        {r.status} · {r.refunded_at ? new Date(r.refunded_at).toLocaleDateString() : new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="shrink-0 font-display text-xl text-emerald-400">-{formatCurrency(r.amount)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
