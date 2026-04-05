"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  fetchClients,
  removeClient,
  saveClient,
  subscribeClientsRealtime,
  summarizeClients,
  type Client,
  type ClientStatus,
} from "@/lib/clients"
import { hasAdminAccess } from "@/lib/admin-auth"

interface ClientForm {
  name: string
  category: string
  description: string
  link: string
  status: ClientStatus
}

const INITIAL_FORM: ClientForm = {
  name: "",
  category: "",
  description: "",
  link: "",
  status: "live",
}

export default function AdminClientsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState<ClientForm>(INITIAL_FORM)
  const requestIdRef = useRef(0)

  const loadClients = useCallback(async () => {
    const requestId = ++requestIdRef.current

    try {
      const data = await fetchClients({ includeArchived: true })

      if (requestId === requestIdRef.current) {
        setClients(data)
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        setMessage(error instanceof Error ? error.message : "Unable to load clients.")
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  const resetForm = useCallback(() => {
    setEditingId(null)
    setForm(INITIAL_FORM)
  }, [])

  useEffect(() => {
    let active = true

    const init = async () => {
      const allowed = await hasAdminAccess()

      if (!allowed) {
        router.replace("/")
        return
      }

      if (active) {
        await loadClients()
      }
    }

    void init()

    return () => {
      active = false
    }
  }, [loadClients, router])

  useEffect(() => {
    const unsubscribe = subscribeClientsRealtime("saintce-clients", () => {
      void loadClients()
    })

    return unsubscribe
  }, [loadClients])

  const handleSubmit = useCallback(async () => {
    if (submitting) {
      return
    }

    if (!form.name.trim() || !form.link.trim()) {
      setMessage("Client name and link are required.")
      return
    }

    setSubmitting(true)
    setMessage(null)

    try {
      await saveClient(
        {
          name: form.name,
          category: form.category,
          description: form.description,
          link: form.link,
          status: form.status,
        },
        editingId
      )

      setMessage(editingId ? "Client updated." : "Client created.")
      resetForm()
      await loadClients()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save client.")
    } finally {
      setSubmitting(false)
    }
  }, [editingId, form, loadClients, resetForm, submitting])

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = window.confirm("Delete this client?")

      if (!confirmed) {
        return
      }

      try {
        await removeClient(id)
        setMessage("Client deleted.")
        await loadClients()
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Unable to delete client.")
      }
    },
    [loadClients]
  )

  const handleEdit = useCallback((client: Client) => {
    setEditingId(client.id)
    setForm({
      name: client.name,
      category: client.category || "",
      description: client.description || "",
      link: client.link,
      status: client.status,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  const summary = useMemo(() => summarizeClients(clients), [clients])

  if (loading) {
    return <div className="text-[var(--muted)]">Loading client registry...</div>
  }

  return (
    <div>
      <div className="border-b border-[var(--border-soft)] pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-[var(--signal)]">Clients</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          Client registry
        </h1>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-4">
        {[
          { label: "Total", value: summary.total },
          { label: "Live", value: summary.live },
          { label: "Private", value: summary.private },
          { label: "Archived", value: summary.archived },
        ].map((card) => (
          <div key={card.label} className="saintce-inset rounded-[24px] p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{card.label}</p>
            <p className="mt-3 font-display text-4xl">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="saintce-inset rounded-[28px] p-6">
          <div className="grid gap-4">
            <input
              placeholder="Client name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="saintce-input"
            />
            <input
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              className="saintce-input"
            />
            <input
              placeholder="Project link"
              value={form.link}
              onChange={(e) => setForm((prev) => ({ ...prev, link: e.target.value }))}
              className="saintce-input"
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="saintce-input min-h-[180px]"
            />
            <select
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as ClientStatus }))}
              className="saintce-input"
            >
              <option value="live">Live</option>
              <option value="beta">Beta</option>
              <option value="private">Private</option>
              <option value="archived">Archived</option>
            </select>

            {message && <p className="text-[var(--muted-strong)]">{message}</p>}

            <div className="flex flex-wrap gap-3">
              <button onClick={handleSubmit} disabled={submitting} className="saintce-button">
                {submitting ? "Saving..." : editingId ? "Update client" : "Create client"}
              </button>
              {editingId && (
                <button onClick={resetForm} className="saintce-button saintce-button--ghost">
                  Cancel edit
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="saintce-inset rounded-[28px] p-6">
          <div className="space-y-3">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex flex-col gap-4 rounded-[22px] border border-[var(--border-soft)] px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-lg text-[var(--text-primary)]">{client.name}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {client.category || "Uncategorized"} · {client.status}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => handleEdit(client)} className="saintce-button saintce-button--ghost">
                    Edit
                  </button>
                  <button onClick={() => handleDelete(client.id)} className="saintce-button saintce-button--ghost">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
