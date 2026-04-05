import { supabase } from "@/lib/supabase"

// -------------------------------------------------------
// Types
// -------------------------------------------------------

export interface PortalClient {
  id: string
  name: string
  email: string
  company_name: string | null
  phone: string | null
}

export interface PortalProject {
  id: string
  name: string
  type: string
  domain: string | null
  status: "active" | "suspended" | "archived"
  access_blocked: boolean
  services: PortalService[]
}

export interface PortalService {
  id: string
  name: string
  description: string | null
  price: number
  billing_interval: string
  is_active: boolean
  subscription: PortalSubscription | null
}

export interface PortalSubscription {
  id: string
  status: "active" | "past_due" | "suspended" | "cancelled"
  price: number
  billing_interval: string
  next_billing_date: string | null
  current_period_end: string | null
  stripe_subscription_id: string | null
}

export interface PortalInvoice {
  id: string
  invoice_number: string
  amount: number
  status: "draft" | "issued" | "paid" | "overdue" | "void"
  issue_date: string
  due_date: string
  paid_at: string | null
  stripe_checkout_url: string | null
  project_name: string
  service_name: string
}

export interface PortalPayment {
  id: string
  amount: number
  paid_at: string | null
  payment_reference: string | null
  payment_method: string | null
  invoice_number: string
  project_name: string
  service_name: string
}

export interface PortalSummary {
  totalProjects: number
  activeSubscriptions: number
  overdueInvoices: number
  totalOutstanding: number
}

// -------------------------------------------------------
// Queries (all scoped by RLS — client sees only their data)
// -------------------------------------------------------

export async function getPortalClient(email: string): Promise<PortalClient | null> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, email, company_name, phone")
    .ilike("email", email)
    .single()

  if (error || !data) return null

  return {
    id: String(data.id),
    name: String(data.name),
    email: String(data.email),
    company_name: data.company_name ? String(data.company_name) : null,
    phone: data.phone ? String(data.phone) : null,
  }
}

export async function getPortalProjects(clientId: string): Promise<PortalProject[]> {
  const { data, error } = await supabase
    .from("projects")
    .select(`
      id, name, type, domain, status, access_blocked,
      services (
        id, name, description, price, billing_interval, is_active,
        subscriptions (
          id, status, price, billing_interval,
          next_billing_date, current_period_end, stripe_subscription_id
        )
      )
    `)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error || !data) return []

  return (data as Array<Record<string, unknown>>).map((project) => {
    const services = Array.isArray(project.services)
      ? (project.services as Array<Record<string, unknown>>).map((svc) => {
          const subs = Array.isArray(svc.subscriptions) ? svc.subscriptions : []
          const sub = subs[0] as Record<string, unknown> | undefined

          return {
            id: String(svc.id),
            name: String(svc.name),
            description: svc.description ? String(svc.description) : null,
            price: Number(svc.price),
            billing_interval: String(svc.billing_interval),
            is_active: Boolean(svc.is_active),
            subscription: sub
              ? {
                  id: String(sub.id),
                  status: String(sub.status) as PortalSubscription["status"],
                  price: Number(sub.price),
                  billing_interval: String(sub.billing_interval),
                  next_billing_date: sub.next_billing_date ? String(sub.next_billing_date) : null,
                  current_period_end: sub.current_period_end ? String(sub.current_period_end) : null,
                  stripe_subscription_id: sub.stripe_subscription_id ? String(sub.stripe_subscription_id) : null,
                }
              : null,
          } satisfies PortalService
        })
      : []

    return {
      id: String(project.id),
      name: String(project.name),
      type: String(project.type),
      domain: project.domain ? String(project.domain) : null,
      status: String(project.status) as PortalProject["status"],
      access_blocked: Boolean(project.access_blocked),
      services,
    } satisfies PortalProject
  })
}

export async function getPortalInvoices(clientId: string): Promise<PortalInvoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      id, invoice_number, amount, status, issue_date, due_date, paid_at, stripe_checkout_url,
      subscription:subscriptions (
        service:services (
          name,
          project:projects ( name )
        )
      )
    `)
    .eq("subscriptions.services.projects.client_id", clientId)
    .order("created_at", { ascending: false })

  // Supabase JS v2 doesn't support deep eq on joins like that; use RLS instead
  // Re-fetch with RLS (policies ensure client sees only their invoices)
  if (error) {
    const { data: rlsData, error: rlsError } = await supabase
      .from("invoices")
      .select(`
        id, invoice_number, amount, status, issue_date, due_date, paid_at, stripe_checkout_url,
        subscription:subscriptions (
          service:services (
            name,
            project:projects ( name )
          )
        )
      `)
      .order("created_at", { ascending: false })

    if (rlsError || !rlsData) return []

    return normalizeInvoices(rlsData as Array<Record<string, unknown>>)
  }

  return normalizeInvoices((data ?? []) as Array<Record<string, unknown>>)
}

function normalizeInvoices(rows: Array<Record<string, unknown>>): PortalInvoice[] {
  return rows.map((inv) => {
    const sub = inv.subscription && !Array.isArray(inv.subscription)
      ? (inv.subscription as Record<string, unknown>)
      : Array.isArray(inv.subscription) ? (inv.subscription[0] as Record<string, unknown> | undefined) : undefined

    const svc = sub?.service && !Array.isArray(sub.service)
      ? (sub.service as Record<string, unknown>)
      : Array.isArray(sub?.service) ? (sub.service as Array<Record<string, unknown>>)[0] : undefined

    const proj = svc?.project && !Array.isArray(svc.project)
      ? (svc.project as Record<string, unknown>)
      : Array.isArray(svc?.project) ? (svc.project as Array<Record<string, unknown>>)[0] : undefined

    return {
      id: String(inv.id ?? ""),
      invoice_number: String(inv.invoice_number ?? ""),
      amount: Number(inv.amount ?? 0),
      status: String(inv.status ?? "issued") as PortalInvoice["status"],
      issue_date: String(inv.issue_date ?? ""),
      due_date: String(inv.due_date ?? ""),
      paid_at: inv.paid_at ? String(inv.paid_at) : null,
      stripe_checkout_url: inv.stripe_checkout_url ? String(inv.stripe_checkout_url) : null,
      project_name: proj ? String(proj.name ?? "") : "",
      service_name: svc ? String(svc.name ?? "") : "",
    }
  })
}

export async function getPortalInvoiceById(invoiceId: string): Promise<PortalInvoice | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      id, invoice_number, amount, status, issue_date, due_date, paid_at, stripe_checkout_url,
      subscription:subscriptions (
        service:services (
          name,
          project:projects ( name )
        )
      )
    `)
    .eq("id", invoiceId)
    .single()

  if (error || !data) return null

  const normalized = normalizeInvoices([data as Record<string, unknown>])
  return normalized[0] ?? null
}

export async function getPortalPayments(): Promise<PortalPayment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      id, amount, paid_at, payment_reference, payment_method,
      invoice:invoices (
        invoice_number,
        subscription:subscriptions (
          service:services (
            name,
            project:projects ( name )
          )
        )
      )
    `)
    .eq("status", "paid")
    .order("paid_at", { ascending: false })

  if (error || !data) return []

  return (data as Array<Record<string, unknown>>).map((payment) => {
    const inv = payment.invoice && !Array.isArray(payment.invoice)
      ? (payment.invoice as Record<string, unknown>)
      : Array.isArray(payment.invoice) ? (payment.invoice as Array<Record<string, unknown>>)[0] : undefined

    const sub = inv?.subscription && !Array.isArray(inv.subscription)
      ? (inv.subscription as Record<string, unknown>)
      : Array.isArray(inv?.subscription) ? (inv.subscription as Array<Record<string, unknown>>)[0] : undefined

    const svc = sub?.service && !Array.isArray(sub.service)
      ? (sub.service as Record<string, unknown>)
      : Array.isArray(sub?.service) ? (sub.service as Array<Record<string, unknown>>)[0] : undefined

    const proj = svc?.project && !Array.isArray(svc.project)
      ? (svc.project as Record<string, unknown>)
      : Array.isArray(svc?.project) ? (svc.project as Array<Record<string, unknown>>)[0] : undefined

    return {
      id: String(payment.id ?? ""),
      amount: Number(payment.amount ?? 0),
      paid_at: payment.paid_at ? String(payment.paid_at) : null,
      payment_reference: payment.payment_reference ? String(payment.payment_reference) : null,
      payment_method: payment.payment_method ? String(payment.payment_method) : null,
      invoice_number: inv ? String(inv.invoice_number ?? "") : "",
      project_name: proj ? String(proj.name ?? "") : "",
      service_name: svc ? String(svc.name ?? "") : "",
    }
  })
}

export async function getPortalSummary(clientId: string): Promise<PortalSummary> {
  const projects = await getPortalProjects(clientId)

  let activeSubscriptions = 0
  let overdueInvoices = 0

  for (const project of projects) {
    for (const svc of project.services) {
      if (svc.subscription?.status === "active") activeSubscriptions++
    }
  }

  const invoices = await getPortalInvoices(clientId)
  let totalOutstanding = 0

  for (const inv of invoices) {
    if (inv.status === "overdue") {
      overdueInvoices++
      totalOutstanding += inv.amount
    } else if (inv.status === "issued") {
      totalOutstanding += inv.amount
    }
  }

  return {
    totalProjects: projects.length,
    activeSubscriptions,
    overdueInvoices,
    totalOutstanding,
  }
}
