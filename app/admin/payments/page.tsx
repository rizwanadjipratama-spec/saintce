"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getInvoices } from "@/lib/invoices/service"
import { getPayments, recordPayment } from "@/lib/payments/service"
import type { InvoiceRecord } from "@/lib/invoices/types"
import type { PaymentRecord } from "@/lib/payments/types"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"
import { formatCurrency } from "@/lib/utils"

const INITIAL_FORM = {
  invoice_id: "",
  amount: 0,
  payment_method: "manual transfer",
  payment_gateway: "manual",
  payment_reference: "",
}

export default function AdminPaymentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [form, setForm] = useState(INITIAL_FORM)

  const loadData = useCallback(async () => {
    try {
      const [invoiceRows, paymentRows] = await Promise.all([
        getInvoices({ page: 1, pageSize: 100 }),
        getPayments({ page: 1, pageSize: 100 }),
      ])
      setInvoices(invoiceRows.data)
      setPayments(paymentRows.data)
      setMessage(null)
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load payments."))
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
        await loadData()
      }
    }
    void init()
    return () => {
      active = false
    }
  }, [loadData, router])

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    try {
      await recordPayment(form)
      setForm(INITIAL_FORM)
      setMessage("Payment recorded and subscription synced.")
      await loadData()
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to record payment."))
    } finally {
      setSaving(false)
    }
  }, [form, loadData])

  if (loading) {
    return <div className="text-(--muted)">Loading payments...</div>
  }

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Payments</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">Payment reconciliation</h1>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="saintce-inset rounded-[28px] p-6">
          <div className="grid gap-4">
            <select value={form.invoice_id} onChange={(e) => setForm((prev) => ({ ...prev, invoice_id: e.target.value }))} className="saintce-input">
              <option value="">Select invoice</option>
              {invoices.filter((invoice) => invoice.status !== "paid" && invoice.status !== "void").map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoice_number}</option>)}
            </select>
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: Number(e.target.value || 0) }))} className="saintce-input" placeholder="Amount" />
            <div className="grid gap-4 md:grid-cols-2">
              <input value={form.payment_method} onChange={(e) => setForm((prev) => ({ ...prev, payment_method: e.target.value }))} className="saintce-input" placeholder="Payment method" />
              <input value={form.payment_gateway} onChange={(e) => setForm((prev) => ({ ...prev, payment_gateway: e.target.value }))} className="saintce-input" placeholder="Gateway" />
            </div>
            <input value={form.payment_reference} onChange={(e) => setForm((prev) => ({ ...prev, payment_reference: e.target.value }))} className="saintce-input" placeholder="Reference" />
            {message && <p className="text-(--muted-strong)">{message}</p>}
            <button onClick={handleSubmit} disabled={saving} className="saintce-button">{saving ? "Recording..." : "Record payment"}</button>
          </div>
        </section>

        <section className="saintce-inset rounded-[28px] p-6">
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="rounded-[22px] border border-(--border-soft) px-4 py-4">
                <p className="text-lg text-(--text-primary)">{payment.invoice?.invoice_number || "Payment"}</p>
                <p className="mt-1 text-sm text-(--muted)">{formatCurrency(payment.amount)} · {payment.payment_gateway || "manual"} · {payment.status}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
