"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"

interface AutomationLog {
  id: string
  run_at: string
  invoices_generated: number
  invoices_overdue: number
  subscriptions_suspended: number
  notifications_sent: number
  duration_ms: number
  error_message: string | null
}

interface WebhookEvent {
  id: string
  event_type: string
  event_id: string
  processed_at: string | null
  error_message: string | null
  created_at: string
}

interface RetryLog {
  id: string
  invoice_id: string
  stripe_invoice_id: string | null
  status: string
  error_message: string | null
  retried_at: string
}

type Tab = "automation" | "webhooks" | "retries"

export default function AdminSystemLogsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("automation")
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>([])
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([])
  const [retryLogs, setRetryLogs] = useState<RetryLog[]>([])
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [autoRes, webhookRes, retryRes] = await Promise.all([
        supabase
          .from("automation_logs")
          .select("id, run_at, invoices_generated, invoices_overdue, subscriptions_suspended, notifications_sent, duration_ms, error_message")
          .order("run_at", { ascending: false })
          .limit(50),
        supabase
          .from("stripe_webhook_events")
          .select("id, event_id, event_type, processed_at, error_message, created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("payment_retry_logs")
          .select("id, invoice_id, stripe_invoice_id, status, error_message, retried_at")
          .order("retried_at", { ascending: false })
          .limit(100),
      ])

      if (autoRes.error) throw autoRes.error
      if (webhookRes.error) throw webhookRes.error
      // retryRes might not exist yet if no retries have run — ignore error
      setAutomationLogs((autoRes.data ?? []) as AutomationLog[])
      setWebhookEvents((webhookRes.data ?? []) as WebhookEvent[])
      setRetryLogs((retryRes.data ?? []) as RetryLog[])
      setMessage(null)
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to load system logs."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const init = async () => {
      const allowed = await hasAdminAccess()
      if (!allowed) { router.replace("/login"); return }
      if (active) await load()
    }
    void init()
    return () => { active = false }
  }, [load, router])

  if (loading) return <div className="text-(--muted)">Loading system logs...</div>

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "automation", label: "Billing cron", count: automationLogs.length },
    { id: "webhooks", label: "Stripe webhooks", count: webhookEvents.length },
    { id: "retries", label: "Payment retries", count: retryLogs.length },
  ]

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Monitoring</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          System logs
        </h1>
        <p className="mt-3 text-(--muted)">Billing cron runs, Stripe webhook events, and payment retry history.</p>
      </div>

      {message && <p className="mt-6 text-(--signal)">{message}</p>}

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-3">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-[14px] border px-4 py-2 text-sm transition ${
              tab === t.id
                ? "border-(--signal) text-(--text-primary)"
                : "border-(--border-soft) text-(--muted) hover:text-(--text-primary)"
            }`}
          >
            {t.label}
            <span className="ml-2 text-xs text-(--muted)">({t.count})</span>
          </button>
        ))}
      </div>

      {/* Automation logs */}
      {tab === "automation" && (
        <section className="mt-6 saintce-inset rounded-[28px] p-6">
          {automationLogs.length === 0 ? (
            <p className="text-(--muted)">No billing cron runs yet.</p>
          ) : (
            <div className="space-y-3">
              {automationLogs.map((log) => (
                <div key={log.id} className={`rounded-[20px] border px-4 py-4 ${log.error_message ? "border-(--signal)" : "border-(--border-soft)"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="text-(--text-primary)">{log.invoices_generated} generated</span>
                        <span className="text-(--muted)">{log.invoices_overdue} overdue</span>
                        <span className="text-(--muted)">{log.subscriptions_suspended} suspended</span>
                        <span className="text-(--muted)">{log.notifications_sent} emails</span>
                        <span className="text-(--muted)">{log.duration_ms}ms</span>
                      </div>
                      {log.error_message && (
                        <p className="mt-2 text-xs text-(--signal)">{log.error_message}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-(--muted)">{new Date(log.run_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Webhook events */}
      {tab === "webhooks" && (
        <section className="mt-6 saintce-inset rounded-[28px] p-6">
          {webhookEvents.length === 0 ? (
            <p className="text-(--muted)">No webhook events recorded.</p>
          ) : (
            <div className="space-y-3">
              {webhookEvents.map((ev) => (
                <div key={ev.id} className={`rounded-[20px] border px-4 py-4 ${ev.error_message ? "border-(--signal)" : "border-(--border-soft)"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-(--text-primary)">{ev.event_type}</p>
                      <p className="mt-1 font-mono text-xs text-(--muted)">{ev.event_id}</p>
                      {ev.error_message && (
                        <p className="mt-1 text-xs text-(--signal)">{ev.error_message}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-(--muted)">{new Date(ev.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Payment retry logs */}
      {tab === "retries" && (
        <section className="mt-6 saintce-inset rounded-[28px] p-6">
          {retryLogs.length === 0 ? (
            <p className="text-(--muted)">No payment retries recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {retryLogs.map((log) => (
                <div key={log.id} className={`rounded-[20px] border px-4 py-4 ${log.status === "failed" ? "border-(--signal)" : "border-(--border-soft)"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className={`text-xs font-mono uppercase ${log.status === "success" ? "text-emerald-400" : "text-(--signal)"}`}>
                        {log.status}
                      </span>
                      {log.stripe_invoice_id && (
                        <p className="mt-1 font-mono text-xs text-(--muted)">{log.stripe_invoice_id}</p>
                      )}
                      {log.error_message && (
                        <p className="mt-1 text-xs text-(--signal)">{log.error_message}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-xs text-(--muted)">{new Date(log.retried_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
