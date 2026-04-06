"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"

interface AuditLogEntry {
  id: string
  table_name: string
  action: "INSERT" | "UPDATE" | "DELETE"
  record_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

const ACTION_COLORS: Record<string, string> = {
  INSERT: "text-emerald-400 bg-emerald-500/10",
  UPDATE: "text-blue-400 bg-blue-500/10",
  DELETE: "text-(--signal) bg-(--signal)/10",
}

const TABLE_LABELS: Record<string, string> = {
  clients: "Client",
  projects: "Project",
  services: "Service",
  subscriptions: "Subscription",
  invoices: "Invoice",
  payments: "Payment",
  admin_users: "Admin user",
}

function describeChange(entry: AuditLogEntry): string {
  const table = TABLE_LABELS[entry.table_name] ?? entry.table_name
  if (entry.action === "INSERT") {
    const name = entry.new_data?.name ?? entry.new_data?.invoice_number ?? entry.record_id
    return `New ${table.toLowerCase()} created: ${name ?? ""}`
  }
  if (entry.action === "DELETE") {
    const name = entry.old_data?.name ?? entry.old_data?.invoice_number ?? entry.record_id
    return `${table} deleted: ${name ?? ""}`
  }
  // UPDATE — summarise which fields changed
  if (entry.old_data && entry.new_data) {
    const changed = Object.keys(entry.new_data).filter(
      (k) => JSON.stringify(entry.new_data![k]) !== JSON.stringify(entry.old_data![k])
    )
    if (changed.length > 0) {
      return `${table} updated: ${changed.slice(0, 4).join(", ")}${changed.length > 4 ? ` +${changed.length - 4} more` : ""}`
    }
  }
  return `${table} updated`
}

export default function AdminActivityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [filter, setFilter] = useState<string>("all")
  const [message, setMessage] = useState<string | null>(null)
  const requestIdRef = useRef(0)

  const loadLogs = useCallback(async (tableFilter: string) => {
    const requestId = ++requestIdRef.current
    try {
      let query = supabase
        .from("audit_logs")
        .select("id, table_name, action, record_id, old_data, new_data, created_at")
        .order("created_at", { ascending: false })
        .limit(100)

      if (tableFilter !== "all") {
        query = query.eq("table_name", tableFilter)
      }

      const { data, error } = await query
      if (requestId !== requestIdRef.current) return
      if (error) throw error
      setLogs((data ?? []) as AuditLogEntry[])
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setMessage(getErrorMessage(err, "Unable to load activity log."))
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    const init = async () => {
      const allowed = await hasAdminAccess()
      if (!allowed) { router.replace("/login"); return }
      if (active) await loadLogs(filter)
    }
    void init()
    return () => { active = false }
  }, [loadLogs, router, filter])

  const tables = ["all", "clients", "projects", "services", "subscriptions", "invoices", "payments"]

  if (loading) return <div className="text-(--muted)">Loading activity log...</div>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Admin</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          Activity log
        </h1>
        <p className="mt-3 text-(--muted)">Audit trail of all create, update, and delete actions across billing tables.</p>
      </div>

      {/* Table filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {tables.map((t) => (
          <button
            key={t}
            onClick={() => { setFilter(t); setLoading(true); void loadLogs(t) }}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              filter === t
                ? "bg-(--panel-subtle) border border-(--border-soft) text-(--text-primary)"
                : "text-(--muted) hover:text-(--text-primary)"
            }`}
          >
            {TABLE_LABELS[t] ?? "All"}
          </button>
        ))}
      </div>

      {message && <p className="mt-4 text-(--signal)">{message}</p>}

      <div className="mt-6 space-y-2">
        {logs.length === 0 ? (
          <div className="saintce-inset rounded-3xl p-8 text-center">
            <p className="text-(--muted)">No activity recorded yet.</p>
          </div>
        ) : logs.map((entry) => (
          <div key={entry.id} className="saintce-inset rounded-[20px] px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ACTION_COLORS[entry.action] ?? ""}`}>
                  {entry.action}
                </span>
                <span className="rounded-full border border-(--border-soft) px-2.5 py-0.5 text-xs text-(--muted)">
                  {TABLE_LABELS[entry.table_name] ?? entry.table_name}
                </span>
                <p className="text-sm text-(--text-primary)">{describeChange(entry)}</p>
              </div>
              <p className="shrink-0 text-xs text-(--muted)">
                {new Date(entry.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
