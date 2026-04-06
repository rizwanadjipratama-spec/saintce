import { supabase } from "@/lib/supabase"
import type { BillingOverview } from "@/lib/billing/types"

function normalizeRecentPayments(data: Array<Record<string, unknown>>) {
  return data.map((payment) => {
    const invoiceValue = Array.isArray(payment.invoice)
      ? payment.invoice[0]
      : payment.invoice

    const invoiceRecord = invoiceValue && typeof invoiceValue === "object"
      ? (invoiceValue as { invoice_number?: unknown })
      : null

    return {
      id: String(payment.id ?? ""),
      amount: Number(payment.amount ?? 0),
      paid_at: typeof payment.paid_at === "string" ? payment.paid_at : null,
      payment_reference: typeof payment.payment_reference === "string" ? payment.payment_reference : null,
      invoice: invoiceRecord ? { invoice_number: typeof invoiceRecord.invoice_number === "string" ? invoiceRecord.invoice_number : null } : null,
    }
  }) as BillingOverview["recentPayments"]
}

function normalizeRecentInvoices(data: Array<Record<string, unknown>>) {
  return data.map((invoice) => ({
    id: String(invoice.id ?? ""),
    invoice_number: String(invoice.invoice_number ?? ""),
    amount: Number(invoice.amount ?? 0),
    status: String(invoice.status ?? "draft"),
    due_date: String(invoice.due_date ?? ""),
  })) as BillingOverview["recentInvoices"]
}

function normalizeOverdueInvoicesList(data: Array<Record<string, unknown>>): BillingOverview["overdueInvoicesList"] {
  return data.map((inv) => {
    const sub = Array.isArray(inv.subscription) ? inv.subscription[0] : inv.subscription
    const svc = sub && typeof sub === "object" ? (Array.isArray((sub as Record<string,unknown>).service) ? ((sub as Record<string,unknown>).service as Record<string,unknown>[])[0] : (sub as Record<string,unknown>).service) : undefined
    const proj = svc && typeof svc === "object" ? (Array.isArray((svc as Record<string,unknown>).project) ? ((svc as Record<string,unknown>).project as Record<string,unknown>[])[0] : (svc as Record<string,unknown>).project) : undefined
    const client = proj && typeof proj === "object" ? (Array.isArray((proj as Record<string,unknown>).client) ? ((proj as Record<string,unknown>).client as Record<string,unknown>[])[0] : (proj as Record<string,unknown>).client) : undefined

    return {
      id: String(inv.id ?? ""),
      invoice_number: String(inv.invoice_number ?? ""),
      amount: Number(inv.amount ?? 0),
      due_date: String(inv.due_date ?? ""),
      client_name: client && typeof client === "object" ? String((client as Record<string,unknown>).name ?? "Unknown") : "Unknown",
      project_name: proj && typeof proj === "object" ? String((proj as Record<string,unknown>).name ?? "Unknown") : "Unknown",
    }
  })
}

function normalizeSuspendedSubscriptionsList(data: Array<Record<string, unknown>>): BillingOverview["suspendedSubscriptionsList"] {
  return data.map((sub) => {
    const svc = Array.isArray(sub.service) ? sub.service[0] : sub.service
    const proj = svc && typeof svc === "object" ? (Array.isArray((svc as Record<string,unknown>).project) ? ((svc as Record<string,unknown>).project as Record<string,unknown>[])[0] : (svc as Record<string,unknown>).project) : undefined
    const client = proj && typeof proj === "object" ? (Array.isArray((proj as Record<string,unknown>).client) ? ((proj as Record<string,unknown>).client as Record<string,unknown>[])[0] : (proj as Record<string,unknown>).client) : undefined

    return {
      id: String(sub.id ?? ""),
      client_name: client && typeof client === "object" ? String((client as Record<string,unknown>).name ?? "Unknown") : "Unknown",
      project_name: proj && typeof proj === "object" ? String((proj as Record<string,unknown>).name ?? "Unknown") : "Unknown",
      service_name: svc && typeof svc === "object" ? String((svc as Record<string,unknown>).name ?? "Unknown") : "Unknown",
      suspended_at: typeof sub.suspended_at === "string" ? sub.suspended_at : null,
    }
  })
}

function normalizeRecentStripeEvents(data: Array<Record<string, unknown>>) {
  return data.map((event) => ({
    id: String(event.id ?? ""),
    event_id: String(event.event_id ?? ""),
    event_type: String(event.event_type ?? "unknown"),
    processing_status: (typeof event.processing_status === "string" ? event.processing_status : "processing") as BillingOverview["recentStripeEvents"][number]["processing_status"],
    error_message: typeof event.error_message === "string" ? event.error_message : null,
    livemode: Boolean(event.livemode),
    received_at: String(event.received_at ?? ""),
  })) as BillingOverview["recentStripeEvents"]
}

export async function fetchBillingOverview(): Promise<BillingOverview> {
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    clientsResult,
    projectsResult,
    subscriptionsResult,
    overdueInvoicesResult,
    suspendedServicesResult,
    recentPaymentsResult,
    recentInvoicesResult,
    monthlyRevenueResult,
    stripeWebhookFailuresResult,
    recentStripeEventsResult,
    mrrResult,
    automationLogsResult,
    overdueInvoicesListResult,
    suspendedSubscriptionsListResult,
  ] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("projects").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("status", "overdue"),
    supabase.from("services").select("id", { count: "exact", head: true }).eq("is_active", false),
    supabase.from("payments").select("id, amount, paid_at, payment_reference, invoice:invoices(invoice_number)").order("created_at", { ascending: false }).limit(5),
    supabase.from("invoices").select("id, invoice_number, amount, status, due_date").order("created_at", { ascending: false }).limit(5),
    supabase.from("payments").select("amount, paid_at").gte("paid_at", startOfMonth).eq("status", "paid"),
    supabase.from("stripe_webhook_events").select("id", { count: "exact", head: true }).eq("processing_status", "failed"),
    supabase.from("stripe_webhook_events").select("id, event_id, event_type, processing_status, error_message, livemode, received_at").order("received_at", { ascending: false }).limit(6),
    supabase.from("subscriptions").select("price, billing_interval").eq("status", "active"),
    supabase.from("automation_logs").select("id, run_at, invoices_generated, invoices_overdue, subscriptions_suspended, notifications_sent, duration_ms, error_message").order("run_at", { ascending: false }).limit(5),
    // Overdue invoices with client/project names
    supabase.from("invoices").select(`
      id, invoice_number, amount, due_date,
      subscription:subscriptions(
        service:services(
          project:projects(
            name,
            client:clients(name)
          )
        )
      )
    `).eq("status", "overdue").order("due_date", { ascending: true }).limit(10),
    // Suspended subscriptions with client/project/service names
    supabase.from("subscriptions").select(`
      id, suspended_at,
      service:services(
        name,
        project:projects(
          name,
          client:clients(name)
        )
      )
    `).eq("status", "suspended").order("suspended_at", { ascending: false }).limit(10),
  ])

  const criticalErrors = [
    clientsResult.error,
    projectsResult.error,
    subscriptionsResult.error,
    overdueInvoicesResult.error,
    suspendedServicesResult.error,
    recentPaymentsResult.error,
    recentInvoicesResult.error,
    monthlyRevenueResult.error,
    stripeWebhookFailuresResult.error,
    recentStripeEventsResult.error,
  ].filter(Boolean)

  if (criticalErrors.length > 0) {
    throw criticalErrors[0]
  }

  const monthlyRevenue = (monthlyRevenueResult.data ?? []).reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)

  // MRR: monthly subscriptions at full price + yearly / 12
  const mrr = (mrrResult.data ?? []).reduce((sum, sub) => {
    const price = Number(sub.price ?? 0)
    if (sub.billing_interval === "monthly") return sum + price
    if (sub.billing_interval === "yearly") return sum + price / 12
    return sum
  }, 0)

  return {
    monthlyRevenue,
    mrr,
    activeSubscriptions: subscriptionsResult.count ?? 0,
    overdueInvoices: overdueInvoicesResult.count ?? 0,
    suspendedServices: suspendedServicesResult.count ?? 0,
    totalClients: clientsResult.count ?? 0,
    totalProjects: projectsResult.count ?? 0,
    stripeWebhookFailures: stripeWebhookFailuresResult.count ?? 0,
    recentPayments: normalizeRecentPayments((recentPaymentsResult.data ?? []) as Array<Record<string, unknown>>),
    recentInvoices: normalizeRecentInvoices((recentInvoicesResult.data ?? []) as Array<Record<string, unknown>>),
    overdueInvoicesList: normalizeOverdueInvoicesList((overdueInvoicesListResult.data ?? []) as Array<Record<string, unknown>>),
    suspendedSubscriptionsList: normalizeSuspendedSubscriptionsList((suspendedSubscriptionsListResult.data ?? []) as Array<Record<string, unknown>>),
    recentStripeEvents: normalizeRecentStripeEvents((recentStripeEventsResult.data ?? []) as Array<Record<string, unknown>>),
    recentAutomationLogs: (automationLogsResult.data ?? []).map((log) => {
      const r = log as Record<string, unknown>
      return {
        id: String(r.id ?? ""),
        run_at: String(r.run_at ?? ""),
        invoices_generated: Number(r.invoices_generated ?? 0),
        invoices_overdue: Number(r.invoices_overdue ?? 0),
        subscriptions_suspended: Number(r.subscriptions_suspended ?? 0),
        notifications_sent: Number(r.notifications_sent ?? 0),
        duration_ms: Number(r.duration_ms ?? 0),
        error_message: typeof r.error_message === "string" ? r.error_message : null,
      }
    }),
  }
}
