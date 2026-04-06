"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getServices } from "@/lib/services/service"
import { getSubscriptions, saveSubscriptionRecord, updateSubscriptionStatus, updateSubscriptionBillingDate, updateSubscriptionPlan } from "@/lib/subscriptions/service"
import type { ServiceRecord, BillingInterval } from "@/lib/services/types"
import type { SubscriptionRecord, SubscriptionStatus } from "@/lib/subscriptions/types"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"
import { formatCurrency } from "@/lib/utils"

const today = new Date().toISOString().slice(0, 10)
const INITIAL_FORM = {
  service_id: "",
  status: "active" as SubscriptionStatus,
  price: 0,
  billing_interval: "monthly" as const,
  current_period_start: today,
  current_period_end: today,
  next_billing_date: today,
  grace_period_days: 7,
}

async function getAdminAccessToken() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error("Missing admin session token.")
  return token
}

export default function AdminSubscriptionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([])
  const [form, setForm] = useState(INITIAL_FORM)

  // Upgrade/downgrade state
  const [expandedSub, setExpandedSub] = useState<string | null>(null)
  const [editPlan, setEditPlan] = useState<Record<string, { price: number; billing_interval: string }>>({})
  const [savingPlan, setSavingPlan] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [serviceRows, subscriptionRows] = await Promise.all([
        getServices({ page: 1, pageSize: 100 }),
        getSubscriptions({ page: 1, pageSize: 100 }),
      ])
      setServices(serviceRows.data)
      setSubscriptions(subscriptionRows.data)
      setMessage(null)
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load subscriptions."))
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
    setSaving(true)
    try {
      await saveSubscriptionRecord(form)
      setForm(INITIAL_FORM)
      setMessage("Subscription created.")
      await loadData()
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save subscription."))
    } finally {
      setSaving(false)
    }
  }, [form, loadData])

  const handleStatus = useCallback(async (subscriptionId: string, status: SubscriptionStatus) => {
    try {
      await updateSubscriptionStatus(subscriptionId, status)
      setMessage(`Subscription ${status}.`)
      await loadData()
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to update subscription status."))
    }
  }, [loadData])

  const handleReschedule = useCallback(async (subscriptionId: string) => {
    try {
      await updateSubscriptionBillingDate(subscriptionId, today)
      setMessage("Next billing date updated to today.")
      await loadData()
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to update billing date."))
    }
  }, [loadData])

  const handleStripeRecurringCheckout = useCallback(async (subscriptionId: string) => {
    try {
      const token = await getAdminAccessToken()
      const response = await fetch("/api/payments/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscriptionId, mode: "subscription" }),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string; session?: { url?: string | null } } | null
      if (!response.ok || !payload?.session?.url) throw new Error(payload?.error || "Unable to create Stripe subscription checkout session.")
      window.open(payload.session.url, "_blank", "noopener,noreferrer")
      setMessage("Stripe recurring checkout session created.")
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to create Stripe recurring checkout session."))
    }
  }, [])

  const handleBillingPortal = useCallback(async (subscriptionId: string) => {
    try {
      const token = await getAdminAccessToken()
      const response = await fetch("/api/payments/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscriptionId }),
      })
      const payload = (await response.json().catch(() => null)) as { error?: string; session?: { url?: string | null } } | null
      if (!response.ok || !payload?.session?.url) throw new Error(payload?.error || "Unable to create Stripe billing portal session.")
      window.open(payload.session.url, "_blank", "noopener,noreferrer")
      setMessage("Stripe billing portal opened.")
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to open Stripe billing portal."))
    }
  }, [])

  const toggleEditPlan = useCallback((sub: SubscriptionRecord) => {
    setExpandedSub((prev) => {
      if (prev === sub.id) return null
      // Pre-fill edit form with current values
      setEditPlan((d) => ({ ...d, [sub.id]: { price: sub.price, billing_interval: sub.billing_interval } }))
      return sub.id
    })
  }, [])

  const handleSavePlan = useCallback(async (subscriptionId: string) => {
    const draft = editPlan[subscriptionId]
    if (!draft) return
    setSavingPlan(subscriptionId)
    try {
      await updateSubscriptionPlan(subscriptionId, draft.price, draft.billing_interval as BillingInterval)
      setMessage("Plan updated.")
      setExpandedSub(null)
      await loadData()
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to update plan."))
    } finally {
      setSavingPlan(null)
    }
  }, [editPlan, loadData])

  if (loading) return <div className="text-(--muted)">Loading subscriptions...</div>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Subscriptions</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">Recurring billing control</h1>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        {/* Create form */}
        <section className="saintce-inset rounded-[28px] p-6">
          <div className="grid gap-4">
            <select value={form.service_id} onChange={(e) => setForm((prev) => ({ ...prev, service_id: e.target.value }))} className="saintce-input">
              <option value="">Select service</option>
              {services.filter((service) => service.is_recurring).map((service) => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
            <div className="grid gap-4 md:grid-cols-2">
              <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value || 0) }))} className="saintce-input" placeholder="Price" />
              <select value={form.billing_interval} onChange={(e) => setForm((prev) => ({ ...prev, billing_interval: e.target.value as typeof form.billing_interval }))} className="saintce-input">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <input type="date" value={form.current_period_start} onChange={(e) => setForm((prev) => ({ ...prev, current_period_start: e.target.value }))} className="saintce-input" />
              <input type="date" value={form.current_period_end} onChange={(e) => setForm((prev) => ({ ...prev, current_period_end: e.target.value }))} className="saintce-input" />
              <input type="date" value={form.next_billing_date} onChange={(e) => setForm((prev) => ({ ...prev, next_billing_date: e.target.value }))} className="saintce-input" />
            </div>
            <input type="number" min="0" value={form.grace_period_days} onChange={(e) => setForm((prev) => ({ ...prev, grace_period_days: Number(e.target.value || 0) }))} className="saintce-input" placeholder="Grace period days" />
            {message && <p className="text-(--muted-strong)">{message}</p>}
            <button onClick={handleSubmit} disabled={saving} className="saintce-button">{saving ? "Saving..." : "Create subscription"}</button>
          </div>
        </section>

        {/* Subscription list */}
        <section className="saintce-inset rounded-[28px] p-6">
          <div className="space-y-3">
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="rounded-[22px] border border-(--border-soft) px-4 py-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg text-(--text-primary)">{subscription.service?.name || "Unknown service"}</p>
                    <p className="mt-1 text-sm text-(--muted)">
                      {formatCurrency(subscription.price)} · {subscription.billing_interval} · {subscription.status} · next {subscription.next_billing_date.slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => toggleEditPlan(subscription)} className="saintce-button saintce-button--ghost">
                      {expandedSub === subscription.id ? "Cancel" : "Edit plan"}
                    </button>
                    <button onClick={() => handleStripeRecurringCheckout(subscription.id)} className="saintce-button saintce-button--ghost">Stripe</button>
                    <button onClick={() => handleBillingPortal(subscription.id)} className="saintce-button saintce-button--ghost">Portal</button>
                    <button onClick={() => handleStatus(subscription.id, "active")} className="saintce-button saintce-button--ghost">Activate</button>
                    <button onClick={() => handleStatus(subscription.id, "suspended")} className="saintce-button saintce-button--ghost">Suspend</button>
                    <button onClick={() => handleReschedule(subscription.id)} className="saintce-button saintce-button--ghost">Bill today</button>
                  </div>
                </div>

                {/* Upgrade / downgrade panel */}
                {expandedSub === subscription.id && editPlan[subscription.id] && (
                  <div className="mt-4 border-t border-(--border-soft) pt-4">
                    <p className="mb-3 text-xs uppercase tracking-[0.14em] text-(--muted)">Change plan</p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-(--muted)">New price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editPlan[subscription.id].price}
                          onChange={(e) => setEditPlan((d) => ({ ...d, [subscription.id]: { ...d[subscription.id], price: Number(e.target.value || 0) } }))}
                          className="saintce-input w-36"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-(--muted)">Billing interval</label>
                        <select
                          value={editPlan[subscription.id].billing_interval}
                          onChange={(e) => setEditPlan((d) => ({ ...d, [subscription.id]: { ...d[subscription.id], billing_interval: e.target.value } }))}
                          className="saintce-input"
                        >
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      <button
                        onClick={() => handleSavePlan(subscription.id)}
                        disabled={savingPlan === subscription.id}
                        className="saintce-button"
                      >
                        {savingPlan === subscription.id ? "Saving..." : "Save plan"}
                      </button>
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
