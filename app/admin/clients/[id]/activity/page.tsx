"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"

interface AuditEntry {
  id: string
  table_name: string
  operation: string
  record_id: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_by: string | null
  created_at: string
}

const OP_COLOR: Record<string, string> = {
  INSERT: "text-emerald-400",
  UPDATE: "text-blue-400",
  DELETE: "text-(--signal)",
}

function describeChange(entry: AuditEntry): string {
  if (entry.operation === "INSERT") {
    const name = entry.new_data?.name ?? entry.new_data?.number ?? entry.record_id
    return `Created ${entry.table_name.replace(/_/g, " ")}: ${String(name)}`
  }
  if (entry.operation === "DELETE") {
    const name = entry.old_data?.name ?? entry.old_data?.number ?? entry.record_id
    return `Deleted from ${entry.table_name.replace(/_/g, " ")}: ${String(name)}`
  }
  // UPDATE
  const changed: string[] = []
  const old = entry.old_data ?? {}
  const next = entry.new_data ?? {}
  for (const key of Object.keys(next)) {
    if (JSON.stringify(old[key]) !== JSON.stringify(next[key])) {
      changed.push(`${key}: ${String(old[key] ?? "—")} → ${String(next[key])}`)
    }
  }
  return changed.length > 0
    ? `Updated ${entry.table_name.replace(/_/g, " ")}: ${changed.join(", ")}`
    : `Updated ${entry.table_name.replace(/_/g, " ")}`
}

export default function ClientActivityPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [clientName, setClientName] = useState<string>("")
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      // Load client name
      const { data: clientRow } = await supabase
        .from("clients")
        .select("name")
        .eq("id", clientId)
        .maybeSingle()
      setClientName((clientRow as Record<string, unknown> | null)?.name as string ?? "Client")

      // Load audit logs for this client_id across related tables
      // We look for records where record_id = clientId, or in child tables via new_data/old_data containing client_id
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, table_name, operation, record_id, old_data, new_data, changed_by, created_at")
        .or(`record_id.eq.${clientId},new_data->>client_id.eq.${clientId},old_data->>client_id.eq.${clientId}`)
        .order("created_at", { ascending: false })
        .limit(150)

      if (error) throw error
      setLogs((data ?? []) as AuditEntry[])
      setMessage(null)
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to load client activity."))
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    if (!clientId) { router.replace("/admin/clients"); return }
    let active = true
    const init = async () => {
      const allowed = await hasAdminAccess()
      if (!allowed) { router.replace("/login"); return }
      if (active) await load()
    }
    void init()
    return () => { active = false }
  }, [load, router, clientId])

  if (loading) return <div className="text-(--muted)">Loading activity...</div>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <Link href="/admin/clients" className="text-xs text-(--muted) hover:text-(--text-primary) transition">
          ← Clients
        </Link>
        <p className="mt-4 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Client activity</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,4vw,4rem)] leading-none tracking-[-0.04em]">
          {clientName}
        </h1>
        <p className="mt-3 text-(--muted)">Full audit trail for this client — last 150 events.</p>
      </div>

      {message && <p className="mt-6 text-(--signal)">{message}</p>}

      <section className="mt-8 saintce-inset rounded-[28px] p-6">
        {logs.length === 0 ? (
          <p className="text-(--muted)">No activity recorded for this client yet.</p>
        ) : (
          <div className="space-y-3">
            {logs.map((entry) => (
              <div key={entry.id} className="rounded-[20px] border border-(--border-soft) px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-mono uppercase ${OP_COLOR[entry.operation] ?? "text-(--muted)"}`}>
                        {entry.operation}
                      </span>
                      <span className="text-xs text-(--muted)">{entry.table_name}</span>
                    </div>
                    <p className="mt-1 text-sm text-(--text-primary)">{describeChange(entry)}</p>
                    {entry.changed_by && (
                      <p className="mt-0.5 text-xs text-(--muted)">by {entry.changed_by}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-xs text-(--muted)">
                    {new Date(entry.created_at).toLocaleString()}
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
