"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"

interface EmailLogEntry {
  id: string
  to_email: string
  subject: string | null
  notification_type: string | null
  invoice_id: string | null
  client_id: string | null
  status: string
  error_message: string | null
  sent_at: string
}

const STATUS_COLOR: Record<string, string> = {
  sent: "text-emerald-400",
  failed: "text-(--signal)",
  pending: "text-amber-400",
}

export default function AdminEmailLogsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<EmailLogEntry[]>([])
  const [filter, setFilter] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      let query = supabase
        .from("notification_logs")
        .select("id, to_email, subject, notification_type, invoice_id, client_id, status, error_message, sent_at")
        .order("sent_at", { ascending: false })
        .limit(200)

      if (filter) {
        query = query.eq("status", filter)
      }

      const { data, error } = await query
      if (error) throw error
      setLogs((data ?? []) as EmailLogEntry[])
      setMessage(null)
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to load email logs."))
    } finally {
      setLoading(false)
    }
  }, [filter])

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

  if (loading) return <div className="text-(--muted)">Loading email logs...</div>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Logging</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          Email logs
        </h1>
        <p className="mt-3 text-(--muted)">All outbound notification emails — last 200 entries.</p>
      </div>

      {message && <p className="mt-6 text-(--signal)">{message}</p>}

      {/* Filter */}
      <div className="mt-6 flex flex-wrap gap-3">
        {["", "sent", "failed", "pending"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-[14px] border px-4 py-2 text-sm transition ${
              filter === s
                ? "border-(--signal) text-(--text-primary)"
                : "border-(--border-soft) text-(--muted) hover:text-(--text-primary)"
            }`}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <section className="mt-6 saintce-inset rounded-[28px] p-6">
        {logs.length === 0 ? (
          <p className="text-(--muted)">No email logs found.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((entry) => (
              <div key={entry.id} className="rounded-[20px] border border-(--border-soft) px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-mono uppercase ${STATUS_COLOR[entry.status] ?? "text-(--muted)"}`}>
                        {entry.status}
                      </span>
                      {entry.notification_type && (
                        <span className="text-xs text-(--muted)">{entry.notification_type}</span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-(--text-primary)">{entry.to_email}</p>
                    {entry.subject && (
                      <p className="mt-0.5 text-xs text-(--muted)">{entry.subject}</p>
                    )}
                    {entry.error_message && (
                      <p className="mt-1 text-xs text-(--signal)">{entry.error_message}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-xs text-(--muted)">
                    {new Date(entry.sent_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
