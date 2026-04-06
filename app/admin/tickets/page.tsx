"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"
import {
  getTickets,
  getTicketComments,
  updateTicketStatus,
  updateTicketPriority,
  addTicketComment,
} from "@/lib/tickets/service"
import type { Ticket, TicketComment, TicketStatus, TicketPriority } from "@/lib/tickets/types"

const STATUS_COLOR: Record<TicketStatus, string> = {
  open: "text-emerald-400",
  in_progress: "text-blue-400",
  waiting: "text-amber-400",
  resolved: "text-(--muted)",
  closed: "text-(--muted)",
}

const PRIORITY_COLOR: Record<TicketPriority, string> = {
  low: "text-(--muted)",
  normal: "text-(--text-primary)",
  high: "text-amber-400",
  urgent: "text-(--signal)",
}

const STATUSES: TicketStatus[] = ["open", "in_progress", "waiting", "resolved", "closed"]
const PRIORITIES: TicketPriority[] = ["low", "normal", "high", "urgent"]

export default function AdminTicketsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [comments, setComments] = useState<TicketComment[]>([])
  const [reply, setReply] = useState("")
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<TicketStatus | "">("")
  const [message, setMessage] = useState<string | null>(null)

  const loadTickets = useCallback(async () => {
    try {
      const rows = await getTickets(filter ? { status: filter as TicketStatus } : {})
      setTickets(rows)
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to load tickets."))
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    let active = true
    const init = async () => {
      const allowed = await hasAdminAccess()
      if (!allowed) { router.replace("/login"); return }
      if (active) await loadTickets()
    }
    void init()
    return () => { active = false }
  }, [loadTickets, router])

  const selectTicket = useCallback(async (id: string) => {
    setSelectedId(id)
    try {
      const c = await getTicketComments(id)
      setComments(c)
    } catch {
      setComments([])
    }
  }, [])

  const handleStatus = useCallback(async (ticketId: string, status: TicketStatus) => {
    try {
      await updateTicketStatus(ticketId, status)
      await loadTickets()
      if (selectedId === ticketId) {
        const c = await getTicketComments(ticketId)
        setComments(c)
      }
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to update status."))
    }
  }, [loadTickets, selectedId])

  const handlePriority = useCallback(async (ticketId: string, priority: TicketPriority) => {
    try {
      await updateTicketPriority(ticketId, priority)
      await loadTickets()
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to update priority."))
    }
  }, [loadTickets])

  const handleReply = useCallback(async () => {
    if (!selectedId || !reply.trim()) return
    setSaving(true)
    try {
      await addTicketComment(selectedId, reply.trim(), "admin")
      setReply("")
      const c = await getTicketComments(selectedId)
      setComments(c)
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to add comment."))
    } finally {
      setSaving(false)
    }
  }, [selectedId, reply])

  const selected = tickets.find((t) => t.id === selectedId) ?? null

  if (loading) return <div className="text-(--muted)">Loading tickets...</div>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Support</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          Tickets
        </h1>
        <p className="mt-3 text-(--muted)">Client support requests — view, reply, and update status.</p>
      </div>

      {message && <p className="mt-4 text-(--signal)">{message}</p>}

      {/* Status filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {(["", ...STATUSES] as Array<TicketStatus | "">).map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setSelectedId(null) }}
            className={`rounded-[12px] border px-4 py-2 text-xs transition ${
              filter === s
                ? "border-(--signal) text-(--text-primary)"
                : "border-(--border-soft) text-(--muted) hover:text-(--text-primary)"
            }`}
          >
            {s === "" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1.5fr]">
        {/* Ticket list */}
        <section className="saintce-inset rounded-[28px] p-6">
          {tickets.length === 0 ? (
            <p className="text-(--muted)">No tickets found.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => selectTicket(ticket.id)}
                  className={`w-full rounded-[18px] border px-4 py-4 text-left transition ${
                    selectedId === ticket.id
                      ? "border-(--signal) bg-(--panel-subtle)"
                      : "border-(--border-soft) hover:border-(--signal)"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-(--text-primary)">{ticket.subject}</p>
                      <p className="mt-1 text-xs text-(--muted)">
                        {ticket.client?.name ?? "Unknown"} · {ticket.project?.name ?? "No project"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-xs font-mono uppercase ${STATUS_COLOR[ticket.status]}`}>{ticket.status.replace("_", " ")}</p>
                      <p className={`mt-1 text-xs ${PRIORITY_COLOR[ticket.priority]}`}>{ticket.priority}</p>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-(--muted)">{new Date(ticket.updated_at).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Ticket detail */}
        <section className="saintce-inset rounded-[28px] p-6">
          {!selected ? (
            <p className="text-(--muted)">Select a ticket to view details.</p>
          ) : (
            <div className="flex h-full flex-col gap-5">
              {/* Header */}
              <div className="border-b border-(--border-soft) pb-4">
                <h2 className="font-display text-xl">{selected.subject}</h2>
                <p className="mt-1 text-sm text-(--muted)">
                  {selected.client?.name} · {selected.client?.email}
                  {selected.project && ` · ${selected.project.name}`}
                </p>
                <p className="mt-2 text-sm text-(--text-primary)">{selected.description}</p>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-(--muted)">Status</label>
                  <select
                    value={selected.status}
                    onChange={(e) => handleStatus(selected.id, e.target.value as TicketStatus)}
                    className="saintce-input text-sm"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-(--muted)">Priority</label>
                  <select
                    value={selected.priority}
                    onChange={(e) => handlePriority(selected.id, e.target.value as TicketPriority)}
                    className="saintce-input text-sm"
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Comments */}
              <div className="flex-1 space-y-3 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-sm text-(--muted)">No comments yet.</p>
                ) : comments.map((c) => (
                  <div key={c.id} className={`rounded-[16px] border px-4 py-3 ${c.author_type === "admin" ? "border-(--signal) bg-(--panel-subtle)" : "border-(--border-soft)"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-mono uppercase ${c.author_type === "admin" ? "text-(--signal)" : "text-(--muted)"}`}>
                        {c.author_type}
                      </span>
                      <span className="text-xs text-(--muted)">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-(--text-primary)">{c.body}</p>
                  </div>
                ))}
              </div>

              {/* Reply */}
              <div className="border-t border-(--border-soft) pt-4">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Write a reply..."
                  className="saintce-input min-h-[90px] w-full"
                />
                <button
                  onClick={handleReply}
                  disabled={saving || !reply.trim()}
                  className="saintce-button mt-3"
                >
                  {saving ? "Sending..." : "Send reply"}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
