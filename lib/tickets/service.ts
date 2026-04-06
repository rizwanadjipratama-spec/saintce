import { supabase } from "@/lib/supabase"
import type { Ticket, TicketComment, TicketInput, TicketPriority, TicketStatus } from "@/lib/tickets/types"

export async function getTickets(filters: { status?: TicketStatus; clientId?: string } = {}): Promise<Ticket[]> {
  let query = supabase
    .from("tickets")
    .select("*, client:clients(name, email), project:projects(name)")
    .order("updated_at", { ascending: false })
    .limit(200)

  if (filters.status) query = query.eq("status", filters.status)
  if (filters.clientId) query = query.eq("client_id", filters.clientId)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Ticket[]
}

export async function getTicketById(ticketId: string): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from("tickets")
    .select("*, client:clients(name, email), project:projects(name)")
    .eq("id", ticketId)
    .maybeSingle()
  if (error) throw error
  return data as Ticket | null
}

export async function createTicket(input: TicketInput): Promise<string> {
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      client_id: input.client_id,
      project_id: input.project_id ?? null,
      subject: input.subject,
      description: input.description,
      priority: input.priority ?? "normal",
    })
    .select("id")
    .single()
  if (error) throw error
  return (data as { id: string }).id
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
  const patch: Record<string, unknown> = { status }
  if (status === "resolved" || status === "closed") {
    patch.resolved_at = new Date().toISOString()
  }
  const { error } = await supabase.from("tickets").update(patch).eq("id", ticketId)
  if (error) throw error
}

export async function updateTicketPriority(ticketId: string, priority: TicketPriority): Promise<void> {
  const { error } = await supabase.from("tickets").update({ priority }).eq("id", ticketId)
  if (error) throw error
}

export async function getTicketComments(ticketId: string): Promise<TicketComment[]> {
  const { data, error } = await supabase
    .from("ticket_comments")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true })
  if (error) throw error
  return (data ?? []) as TicketComment[]
}

export async function addTicketComment(ticketId: string, body: string, authorType: "admin" | "client"): Promise<void> {
  const { error } = await supabase.from("ticket_comments").insert({
    ticket_id: ticketId,
    body,
    author_type: authorType,
  })
  if (error) throw error
}
