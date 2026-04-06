"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getSubscriptions } from "@/lib/subscriptions/service"
import { getInvoices, generateInvoiceManually, markInvoicePaid, voidInvoice, getInvoiceItems, saveInvoiceItems } from "@/lib/invoices/service"
import type { SubscriptionRecord } from "@/lib/subscriptions/types"
import type { InvoiceRecord, InvoiceItem } from "@/lib/invoices/types"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"
import { formatCurrency } from "@/lib/utils"

const today = new Date().toISOString().slice(0, 10)

interface LineItemDraft {
  description: string
  quantity: number
  unit_price: number
}

const BLANK_ITEM: LineItemDraft = { description: "", quantity: 1, unit_price: 0 }

const INITIAL_FORM = {
  subscription_id: "",
  amount: 0,
  issue_date: today,
  due_date: today,
}

export default function AdminInvoicesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([])
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [form, setForm] = useState(INITIAL_FORM)
  const [lineItemDrafts, setLineItemDrafts] = useState<LineItemDraft[]>([{ ...BLANK_ITEM }])

  // Per-invoice expanded line items state
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)
  const [invoiceItems, setInvoiceItems] = useState<Record<string, InvoiceItem[]>>({})
  const [editingItems, setEditingItems] = useState<Record<string, LineItemDraft[]>>({})
  const [savingItems, setSavingItems] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [subscriptionRows, invoiceRows] = await Promise.all([
        getSubscriptions({ page: 1, pageSize: 100 }),
        getInvoices({ page: 1, pageSize: 100 }),
      ])
      setSubscriptions(subscriptionRows.data)
      setInvoices(invoiceRows.data)
      setMessage(null)
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load invoices."))
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

  // Recalculate amount from line items
  const derivedAmount = lineItemDrafts.reduce((s, item) => s + item.quantity * item.unit_price, 0)

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    try {
      const validItems = lineItemDrafts.filter((i) => i.description.trim())
      const amount = validItems.length > 0 ? derivedAmount : form.amount
      const invoiceId = await generateInvoiceManually({ ...form, amount }) as string

      if (invoiceId && validItems.length > 0) {
        await saveInvoiceItems(invoiceId, validItems)
      }

      setForm(INITIAL_FORM)
      setLineItemDrafts([{ ...BLANK_ITEM }])
      setMessage("Invoice generated.")
      await loadData()
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to generate invoice."))
    } finally {
      setSaving(false)
    }
  }, [form, lineItemDrafts, derivedAmount, loadData])

  const handleMarkPaid = useCallback(async (invoiceId: string) => {
    try {
      await markInvoicePaid(invoiceId)
      setMessage("Invoice marked paid.")
      await loadData()
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to mark invoice paid."))
    }
  }, [loadData])

  const handleVoid = useCallback(async (invoiceId: string) => {
    try {
      await voidInvoice(invoiceId)
      setMessage("Invoice voided.")
      await loadData()
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to void invoice."))
    }
  }, [loadData])

  const handleStripeCheckout = useCallback(async (invoiceId: string) => {
    try {
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) throw new Error("Missing admin session token.")

      const response = await fetch("/api/payments/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ invoiceId }),
      })

      const payload = (await response.json().catch(() => null)) as { error?: string; session?: { url?: string | null } } | null
      if (!response.ok || !payload?.session?.url) throw new Error(payload?.error || "Unable to create Stripe checkout session.")

      window.open(payload.session.url, "_blank", "noopener,noreferrer")
      setMessage("Stripe checkout session created.")
      await loadData()
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to create Stripe checkout session."))
    }
  }, [loadData])

  const handleExpandItems = useCallback(async (invoiceId: string) => {
    if (expandedInvoice === invoiceId) {
      setExpandedInvoice(null)
      return
    }
    setExpandedInvoice(invoiceId)
    if (!invoiceItems[invoiceId]) {
      const items = await getInvoiceItems(invoiceId)
      setInvoiceItems((prev) => ({ ...prev, [invoiceId]: items }))
      setEditingItems((prev) => ({
        ...prev,
        [invoiceId]: items.length > 0
          ? items.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price }))
          : [{ ...BLANK_ITEM }],
      }))
    }
  }, [expandedInvoice, invoiceItems])

  const handleSaveItems = useCallback(async (invoiceId: string) => {
    const drafts = editingItems[invoiceId] ?? []
    const valid = drafts.filter((i) => i.description.trim())
    setSavingItems(invoiceId)
    try {
      await saveInvoiceItems(invoiceId, valid)
      const refreshed = await getInvoiceItems(invoiceId)
      setInvoiceItems((prev) => ({ ...prev, [invoiceId]: refreshed }))
      setMessage("Line items saved.")
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to save line items."))
    } finally {
      setSavingItems(null)
    }
  }, [editingItems])

  if (loading) return <div className="text-(--muted)">Loading invoices...</div>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Invoices</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">Invoice issuance</h1>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        {/* Create form */}
        <section className="saintce-inset rounded-[28px] p-6">
          <div className="grid gap-4">
            <select value={form.subscription_id} onChange={(e) => setForm((prev) => ({ ...prev, subscription_id: e.target.value }))} className="saintce-input">
              <option value="">Select subscription</option>
              {subscriptions.map((sub) => <option key={sub.id} value={sub.id}>{sub.service?.name || sub.id}</option>)}
            </select>
            <div className="grid gap-4 md:grid-cols-2">
              <input type="date" value={form.issue_date} onChange={(e) => setForm((prev) => ({ ...prev, issue_date: e.target.value }))} className="saintce-input" />
              <input type="date" value={form.due_date} onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))} className="saintce-input" />
            </div>

            {/* Line items */}
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.12em] text-(--muted)">Line items</p>
              <div className="space-y-2">
                {lineItemDrafts.map((item, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_80px_110px_32px]">
                    <input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => setLineItemDrafts((prev) => prev.map((it, i) => i === index ? { ...it, description: e.target.value } : it))}
                      className="saintce-input"
                    />
                    <input
                      type="number" min="1" step="1" placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => setLineItemDrafts((prev) => prev.map((it, i) => i === index ? { ...it, quantity: Number(e.target.value) } : it))}
                      className="saintce-input"
                    />
                    <input
                      type="number" min="0" step="0.01" placeholder="Unit price"
                      value={item.unit_price}
                      onChange={(e) => setLineItemDrafts((prev) => prev.map((it, i) => i === index ? { ...it, unit_price: Number(e.target.value) } : it))}
                      className="saintce-input"
                    />
                    <button
                      onClick={() => setLineItemDrafts((prev) => prev.length === 1 ? [{ ...BLANK_ITEM }] : prev.filter((_, i) => i !== index))}
                      className="flex items-center justify-center rounded-[12px] border border-(--border-soft) text-(--muted) hover:text-(--signal) transition-colors"
                    >×</button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setLineItemDrafts((prev) => [...prev, { ...BLANK_ITEM }])}
                className="mt-2 text-sm text-(--muted) hover:text-(--text-primary) transition-colors"
              >
                + Add item
              </button>
            </div>

            {derivedAmount > 0 && (
              <div className="rounded-[14px] border border-(--border-soft) px-4 py-3 flex items-center justify-between">
                <p className="text-sm text-(--muted)">Total from items</p>
                <p className="font-display text-xl">{formatCurrency(derivedAmount)}</p>
              </div>
            )}

            {derivedAmount === 0 && (
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: Number(e.target.value || 0) }))} className="saintce-input" placeholder="Amount (if no line items)" />
            )}

            {message && <p className="text-(--muted-strong)">{message}</p>}
            <button onClick={handleSubmit} disabled={saving} className="saintce-button">{saving ? "Generating..." : "Generate invoice"}</button>
          </div>
        </section>

        {/* Invoice list */}
        <section className="saintce-inset rounded-[28px] p-6">
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-[22px] border border-(--border-soft)">
                <div className="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg text-(--text-primary)">{invoice.invoice_number}</p>
                    <p className="mt-1 text-sm text-(--muted)">{formatCurrency(invoice.amount)} · {invoice.status} · due {invoice.due_date}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => handleExpandItems(invoice.id)} className="saintce-button--ghost">
                      {expandedInvoice === invoice.id ? "Hide items" : "Items"}
                    </button>
                    <button onClick={() => handleStripeCheckout(invoice.id)} className="saintce-button--ghost">Stripe link</button>
                    <button onClick={() => handleMarkPaid(invoice.id)} className="saintce-button--ghost">Mark paid</button>
                    <button onClick={() => handleVoid(invoice.id)} className="saintce-button--ghost">Void</button>
                  </div>
                </div>

                {/* Line items editor */}
                {expandedInvoice === invoice.id && (
                  <div className="border-t border-(--border-soft) px-4 py-4">
                    <p className="mb-3 text-xs uppercase tracking-[0.12em] text-(--muted)">Line items</p>
                    <div className="space-y-2">
                      {(editingItems[invoice.id] ?? []).map((item, index) => (
                        <div key={index} className="grid gap-2 sm:grid-cols-[1fr_80px_110px_32px]">
                          <input
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) => setEditingItems((prev) => ({
                              ...prev,
                              [invoice.id]: (prev[invoice.id] ?? []).map((it, i) => i === index ? { ...it, description: e.target.value } : it),
                            }))}
                            className="saintce-input"
                          />
                          <input
                            type="number" min="1" step="1" placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => setEditingItems((prev) => ({
                              ...prev,
                              [invoice.id]: (prev[invoice.id] ?? []).map((it, i) => i === index ? { ...it, quantity: Number(e.target.value) } : it),
                            }))}
                            className="saintce-input"
                          />
                          <input
                            type="number" min="0" step="0.01" placeholder="Unit price"
                            value={item.unit_price}
                            onChange={(e) => setEditingItems((prev) => ({
                              ...prev,
                              [invoice.id]: (prev[invoice.id] ?? []).map((it, i) => i === index ? { ...it, unit_price: Number(e.target.value) } : it),
                            }))}
                            className="saintce-input"
                          />
                          <button
                            onClick={() => setEditingItems((prev) => {
                              const cur = prev[invoice.id] ?? []
                              return { ...prev, [invoice.id]: cur.length === 1 ? [{ ...BLANK_ITEM }] : cur.filter((_, i) => i !== index) }
                            })}
                            className="flex items-center justify-center rounded-[12px] border border-(--border-soft) text-(--muted) hover:text-(--signal) transition-colors"
                          >×</button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        onClick={() => setEditingItems((prev) => ({ ...prev, [invoice.id]: [...(prev[invoice.id] ?? []), { ...BLANK_ITEM }] }))}
                        className="text-sm text-(--muted) hover:text-(--text-primary) transition-colors"
                      >+ Add item</button>
                      <button
                        onClick={() => handleSaveItems(invoice.id)}
                        disabled={savingItems === invoice.id}
                        className="saintce-button"
                      >{savingItems === invoice.id ? "Saving..." : "Save items"}</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
