"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getPortalSession, type PortalSession } from "@/lib/portal/auth"
import { getErrorMessage } from "@/lib/errors"
import {
  getTickets,
  getTicketComments,
  createTicket,
  addTicketComment,
} from "@/lib/tickets/service"
import type { Ticket, TicketComment, TicketPriority } from "@/lib/tickets/types"

const STATUS_COLOR: Record<string, string> = {
  open: "text-emerald-400",
  in_progress: "text-blue-400",
  waiting: "text-amber-400",
  resolved: "text-(--muted)",
  closed: "text-(--muted)",
}

export default function PortalTicketsPage() {
  const router = useRouter()
  const [session, setSession] = useState<PortalSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [comments, setComments] = useState<TicketComment[]>([])
  const [reply, setReply] = useState("")
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [newTicket, setNewTicket] = useState({
    subject: "",
    description: "",
    priority: "normal" as TicketPriority,
  })

  const loadTickets = useCallback(async (clientId: string) => {
    const rows = await getTickets({ clientId })
    setTickets(rows)
  }, [])

  useEffect(() => {
    let active = true
    const init = async () => {
      const s = await getPortalSession()
      if (!s) { router.replace("/portal/login"); return }
      if (active) {
        setSession(s)
        await loadTickets(s.clientId)
        setLoading(false)
      }
    }
    void init()
    return () => { active = false }
  }, [loadTickets, router])

  const selectTicket = useCallback(async (id: string) => {
    setSelectedId(id)
    setShowCreate(false)
    try {
      const c = await getTicketComments(id)
      setComments(c)
    } catch {
      setComments([])
    }
  }, [])

  const handleCreate = useCallback(async () => {
    if (!session || !newTicket.subject.trim() || !newTicket.description.trim()) {
      setMessage("Subject and description are required.")
      return
    }
    setSaving(true)
    try {
      const id = await createTicket({
        client_id: session.clientId,
        subject: newTicket.subject.trim(),
        description: newTicket.description.trim(),
        priority: newTicket.priority,
      })
      setNewTicket({ subject: "", description: "", priority: "normal" })
      setShowCreate(false)
      setMessage("Ticket submitted.")
      await loadTickets(session.clientId)
      await selectTicket(id)
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to submit ticket."))
    } finally {
      setSaving(false)
    }
  }, [session, newTicket, loadTickets, selectTicket])

  const handleReply = useCallback(async () => {
    if (!selectedId || !reply.trim() || !session) return
    setSaving(true)
    try {
      await addTicketComment(selectedId, reply.trim(), "client")
      setReply("")
      const c = await getTicketComments(selectedId)
      setComments(c)
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to send reply."))
    } finally {
      setSaving(false)
    }
  }, [selectedId, reply, session])

  const selected = tickets.find((t) => t.id === selectedId) ?? null

  if (loading) return <div className="text-(--muted)">Loading tickets...</div>

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Support</p>
          <h1 className="mt-2 font-display text-[clamp(2rem,4vw,3.6rem)] leading-none tracking-[-0.04em]">
            Your tickets
          </h1>
        </div>
        <button onClick={() => { setShowCreate(true); setSelectedId(null) }} className="saintce-button">
          New ticket
        </button>
      </div>

      {message && <p className="mb-4 text-(--muted-strong)">{message}</p>}

      <div className="grid gap-5 xl:grid-cols-[1fr_1.5fr]">
        {/* Ticket list */}
        <section className="saintce-inset rounded-[28px] p-6">
          {tickets.length === 0 ? (
            <p className="text-(--muted)">No tickets yet. Click "New ticket" to get started.</p>
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
                    <p className="truncate text-sm text-(--text-primary)">{ticket.subject}</p>
                    <span className={`shrink-0 text-xs font-mono uppercase ${STATUS_COLOR[ticket.status] ?? "text-(--muted)"}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-(--muted)">{new Date(ticket.updated_at).toLocaleDateString()}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Create form or ticket detail */}
        <section className="saintce-inset rounded-[28px] p-6">
          {showCreate ? (
            <div className="space-y-4">
              <h2 className="font-display text-xl">New support ticket</h2>
              <input
                value={newTicket.subject}
                onChange={(e) => setNewTicket((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Subject"
                className="saintce-input"
              />
              <textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket((p) => ({ ...p, description: e.target.value }))}
                placeholder="Describe your issue..."
                className="saintce-input min-h-[140px]"
              />
              <select
                value={newTicket.priority}
                onChange={(e) => setNewTicket((p) => ({ ...p, priority: e.target.value as TicketPriority }))}
                className="saintce-input"
              >
                <option value="low">Low priority</option>
                <option value="normal">Normal priority</option>
                <option value="high">High priority</option>
                <option value="urgent">Urgent</option>
              </select>
              <div className="flex gap-3">
                <button onClick={handleCreate} disabled={saving} className="saintce-button">
                  {saving ? "Submitting..." : "Submit ticket"}
                </button>
                <button onClick={() => setShowCreate(false)} className="saintce-button saintce-button--ghost">
                  Cancel
                </button>
              </div>
            </div>
          ) : !selected ? (
            <p className="text-(--muted)">Select a ticket to view the conversation.</p>
          ) : (
            <div className="flex h-full flex-col gap-4">
              <div className="border-b border-(--border-soft) pb-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl">{selected.subject}</h2>
                  <span className={`text-xs font-mono uppercase ${STATUS_COLOR[selected.status] ?? "text-(--muted)"}`}>
                    {selected.status.replace("_", " ")}
                  </span>
                </div>
                <p className="mt-2 text-sm text-(--text-primary)">{selected.description}</p>
              </div>

              <div className="flex-1 space-y-3">
                {comments.length === 0 ? (
                  <p className="text-sm text-(--muted)">No replies yet. We&apos;ll get back to you soon.</p>
                ) : comments.map((c) => (
                  <div key={c.id} className={`rounded-[16px] border px-4 py-3 ${c.author_type === "admin" ? "border-(--signal) bg-(--panel-subtle)" : "border-(--border-soft)"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-mono uppercase ${c.author_type === "admin" ? "text-(--signal)" : "text-(--muted)"}`}>
                        {c.author_type === "admin" ? "Support" : "You"}
                      </span>
                      <span className="text-xs text-(--muted)">{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 text-sm text-(--text-primary)">{c.body}</p>
                  </div>
                ))}
              </div>

              {selected.status !== "closed" && selected.status !== "resolved" && (
                <div className="border-t border-(--border-soft) pt-4">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Add a reply..."
                    className="saintce-input min-h-[80px] w-full"
                  />
                  <button
                    onClick={handleReply}
                    disabled={saving || !reply.trim()}
                    className="saintce-button mt-3"
                  >
                    {saving ? "Sending..." : "Reply"}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
