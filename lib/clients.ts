import { supabase } from "@/lib/supabase"

/**
 * CLIENT DATA CONTRACT
 * PURPOSE: Shared client typing across public/admin surfaces.
 */
export type ClientStatus = "live" | "beta" | "private" | "archived"

export interface Client {
  id: string
  name: string
  category: string | null
  description: string | null
  link: string
  status: ClientStatus
  created_at?: string
}

interface FetchClientsOptions {
  includeArchived: boolean
}

export interface ClientSummary {
  total: number
  live: number
  beta: number
  private: number
  archived: number
}

/**
 * Fetch clients once with a consistent query shape.
 */
export async function fetchClients({ includeArchived }: FetchClientsOptions): Promise<Client[]> {
  let query = supabase
    .from("clients")
    .select("id, name, category, description, link, status, created_at")
    .order("created_at", { ascending: false })

  if (!includeArchived) {
    query = query.neq("status", "archived")
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []) as Client[]
}

export async function saveClient(payload: Omit<Client, "id" | "created_at">, editingId?: string | null) {
  const normalized = {
    name: payload.name.trim(),
    category: payload.category?.trim() || null,
    description: payload.description?.trim() || null,
    link: payload.link.trim(),
    status: payload.status,
  }

  const query = editingId
    ? supabase.from("clients").update(normalized).eq("id", editingId)
    : supabase.from("clients").insert(normalized)

  const { error } = await query

  if (error) {
    throw error
  }
}

export async function removeClient(id: string) {
  const { error } = await supabase.from("clients").delete().eq("id", id)

  if (error) {
    throw error
  }
}

export async function updateClientStatus(id: string, status: ClientStatus) {
  const { error } = await supabase.from("clients").update({ status }).eq("id", id)

  if (error) {
    throw error
  }
}

export function summarizeClients(clients: Client[]): ClientSummary {
  return clients.reduce<ClientSummary>(
    (summary, client) => {
      summary.total += 1
      summary[client.status] += 1
      return summary
    },
    { total: 0, live: 0, beta: 0, private: 0, archived: 0 }
  )
}

/**
 * Shared realtime subscription helper to prevent duplicate wiring code.
 */
export function subscribeClientsRealtime(
  channelName: string,
  onChange: () => void
) {
  const channel = supabase
    .channel(channelName)
    .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, onChange)
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
