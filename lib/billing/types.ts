export interface BillingOverview {
  monthlyRevenue: number
  mrr: number
  activeSubscriptions: number
  overdueInvoices: number
  suspendedServices: number
  totalClients: number
  totalProjects: number
  stripeWebhookFailures: number
  recentPayments: Array<{
    id: string
    amount: number
    paid_at: string | null
    payment_reference: string | null
    invoice: { invoice_number: string | null } | null
  }>
  recentInvoices: Array<{
    id: string
    invoice_number: string
    amount: number
    status: string
    due_date: string
  }>
  recentStripeEvents: Array<{
    id: string
    event_id: string
    event_type: string
    processing_status: "processing" | "processed" | "failed"
    error_message: string | null
    livemode: boolean
    received_at: string
  }>
  recentAutomationLogs: Array<{
    id: string
    run_at: string
    invoices_generated: number
    invoices_overdue: number
    subscriptions_suspended: number
    notifications_sent: number
    duration_ms: number
    error_message: string | null
  }>
}

export interface BillingRunResult {
  invoicesGenerated: number
  invoicesOverdue: number
  subscriptionsSuspended: number
}

export type BillingNotificationType = "issued" | "reminder"

export interface BillingReminderCandidate {
  invoiceId: string
  invoiceNumber: string
  amount: number
  status: string
  issueDate: string
  dueDate: string
  clientName: string
  email: string
  notificationType: BillingNotificationType
}

export interface BillingReminderDispatchResult {
  notificationsSent: number
  skipped: number
}
