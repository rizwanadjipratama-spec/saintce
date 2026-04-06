"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"
import { formatCurrency } from "@/lib/utils"

interface ClientOption {
  id: string
  name: string
  email: string
}

interface CreditRow {
  id: string
  client_id: string
  amount: number
  description: string
  created_at: string
  client: { name: string } | null
}

interface ClientBalance {
  clientId: string
  clientName: string
  total: number
}

export default function AdminCreditsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [credits, setCredits] = useState<CreditRow[]>([])
  const [balances, setBalances] = useState<ClientBalance[]>([])

  const [form, setForm] = useState({ client_id: "", amount: 0, description: "" })

  const loadData = useCallback(async () => {
    try {
      const [clientsRes, creditsRes] = await Promise.all([
        supabase.from("clients").select("id, name, email").order("name").limit(200),
        supabase
          .from("client_credits")
          .select("id, client_id, amount, description, created_at, client:clients(name)")
          .order("created_at", { ascending: false })
          .limit(200),
      ])

      if (clientsRes.error) throw clientsRes.error
      if (creditsRes.error) throw creditsRes.error

      setClients((clientsRes.data ?? []) as ClientOption[])
      const rows = (creditsRes.data ?? []) as unknown as CreditRow[]
      setCredits(rows)

      // Aggregate balances per client
      const balMap = new Map<string, ClientBalance>()
      for (const row of rows) {
        const name = row.client && typeof row.client === "object" ? String((row.client as Record<string, unknown>).name ?? "") : "Unknown"
        const existing = balMap.get(row.client_id)
        if (existing) {
          existing.total += row.amount
        } else {
          balMap.set(row.client_id, { clientId: row.client_id, clientName: name, total: row.amount })
        }
      }
      setBalances(Array.from(balMap.values()).sort((a, b) => b.total - a.total))
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
    if (!form.client_id) { setMessage("Select a client."); return }
    if (form.amount === 0) { setMessage("Amount cannot be zero."); return }
    if (!form.description.trim()) { setMessage("Description required."); return }
    setSaving(true)
    try {
      const { error } = await supabase.from("client_credits").insert({
        client_id: form.client_id,
        amount: form.amount,
        description: form.description.trim(),
      })
      if (error) throw error
      setMessage(`Credit of ${formatCurrency(form.amount)} recorded.`)
      setForm({ client_id: "", amount: 0, description: "" })
      await loadData()
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to record credit."))
    } finally {
      setSaving(false)
    }
  }, [form, loadData])

  if (loading) return <div className="text-(--muted)">Loading credits...</div>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Billing</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          Client credits
        </h1>
        <p className="mt-3 text-(--muted)">Manual credit balance per client. Positive = credit, negative = debit.</p>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        {/* Create form */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="mb-5 font-display text-xl">Add credit</h2>
          <div className="grid gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Client</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm((f) => ({ ...f, client_id: e.target.value }))}
                className="saintce-input"
              >
                <option value="">Select client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Amount (negative = debit)</label>
              <input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value || 0) }))}
                className="saintce-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Loyalty credit, overpayment refund..."
                className="saintce-input"
              />
            </div>
            {message && <p className="text-(--muted-strong)">{message}</p>}
            <button onClick={handleSubmit} disabled={saving} className="saintce-button">
              {saving ? "Recording..." : "Add credit"}
            </button>
          </div>
        </section>

        <div className="space-y-5">
          {/* Balances */}
          <section className="saintce-inset rounded-[28px] p-6">
            <h2 className="mb-5 font-display text-xl">Balances</h2>
            {balances.length === 0 ? (
              <p className="text-(--muted)">No credits yet.</p>
            ) : (
              <div className="space-y-3">
                {balances.map((b) => (
                  <div key={b.clientId} className="flex items-center justify-between gap-4 rounded-[20px] border border-(--border-soft) px-4 py-4">
                    <p className="text-sm text-(--text-primary)">{b.clientName}</p>
                    <p className={`shrink-0 font-display text-xl ${b.total > 0 ? "text-emerald-400" : "text-(--signal)"}`}>
                      {formatCurrency(b.total)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent entries */}
          <section className="saintce-inset rounded-[28px] p-6">
            <h2 className="mb-5 font-display text-xl">Recent entries</h2>
            {credits.length === 0 ? (
              <p className="text-(--muted)">No entries yet.</p>
            ) : (
              <div className="space-y-3">
                {credits.slice(0, 20).map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-4 rounded-[20px] border border-(--border-soft) px-4 py-4">
                    <div>
                      <p className="text-sm text-(--text-primary)">
                        {row.client && typeof row.client === "object" ? String((row.client as Record<string, unknown>).name ?? "") : ""}
                      </p>
                      <p className="mt-1 text-xs text-(--muted)">{row.description}</p>
                      <p className="mt-0.5 text-xs text-(--muted)">{new Date(row.created_at).toLocaleDateString()}</p>
                    </div>
                    <p className={`shrink-0 font-display text-xl ${row.amount > 0 ? "text-emerald-400" : "text-(--signal)"}`}>
                      {formatCurrency(row.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
