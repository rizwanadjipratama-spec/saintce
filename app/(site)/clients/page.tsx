"use client"

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react"
import ClientCard from "@/components/clients/ClientCard"
import ClientSearch from "@/components/clients/ClientSearch"
import { fetchClients, subscribeClientsRealtime, type Client } from "@/lib/clients"

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const requestIdRef = useRef(0)
  const deferredSearch = useDeferredValue(search)

  const loadClients = useCallback(async () => {
    const requestId = ++requestIdRef.current

    try {
      const data = await fetchClients({ includeArchived: false })

      if (requestId !== requestIdRef.current) {
        return
      }

      setClients(Array.isArray(data) ? data : [])
    } catch (error) {
      if (requestId === requestIdRef.current) {
        console.error("CLIENT FETCH ERROR:", error)
        setClients([])
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    void loadClients()

    let unsubscribe: (() => void) | null = null

    try {
      unsubscribe = subscribeClientsRealtime("clients-live", () => {
        void loadClients()
      })
    } catch (error) {
      console.error("REALTIME ERROR:", error)
    }

    return () => {
      unsubscribe?.()
    }
  }, [loadClients])

  const filteredClients = useMemo(() => {
    if (!deferredSearch.trim()) {
      return clients
    }

    const term = deferredSearch.toLowerCase()

    return clients.filter((client) =>
      `${client.name} ${client.category ?? ""} ${client.description ?? ""}`
        .toLowerCase()
        .includes(term)
    )
  }, [clients, deferredSearch])

  if (loading) {
    return (
      <main className="mx-auto max-w-[1600px] px-6 py-32 md:px-20">
        <div className="text-[var(--muted)]">Loading clients...</div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-32 md:px-20">
      <div className="orion-panel px-6 py-8 md:px-8">
        <div className="mb-8">
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-[var(--signal)]">Client archive</p>
          <h1 className="mt-4 font-display text-[clamp(2.6rem,5vw,5rem)] leading-none tracking-[-0.04em] text-[var(--text-primary)]">
            Live work registry
          </h1>
        </div>

        <ClientSearch search={search} setSearch={setSearch} />

        <div className="mt-8 columns-1 gap-8 md:columns-2 xl:columns-3">
          {filteredClients.length > 0 ? (
            filteredClients.map((client) => (
              <div key={client.id} className="mb-8 break-inside-avoid">
                <ClientCard
                  client={{
                    id: client.id,
                    name: client.name,
                    category: client.category ?? "",
                    description: client.description ?? "",
                    link: client.link,
                    status: client.status,
                  }}
                />
              </div>
            ))
          ) : (
            <div className="text-[var(--muted)]">No clients found.</div>
          )}
        </div>
      </div>
    </main>
  )
}
