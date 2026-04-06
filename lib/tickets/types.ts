export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed"
export type TicketPriority = "low" | "normal" | "high" | "urgent"

export interface Ticket {
  id: string
  client_id: string
  project_id: string | null
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  resolved_at: string | null
  created_at: string
  updated_at: string
  // joined
  client?: { name: string; email: string } | null
  project?: { name: string } | null
}

export interface TicketComment {
  id: string
  ticket_id: string
  body: string
  author_id: string | null
  author_type: "admin" | "client"
  created_at: string
}

export interface TicketInput {
  client_id: string
  project_id?: string | null
  subject: string
  description: string
  priority?: TicketPriority
}
