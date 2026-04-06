import "server-only"

import Stripe from "stripe"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { sendInvoiceReminder, sendInvoiceReminder2, sendInvoiceReminder3, sendIssuedInvoiceNotification, sendSubscriptionSuspendedEmail } from "@/lib/notifications/service"
import { formatCurrency } from "@/lib/utils"
import type {
  BillingReminderCandidate,
  BillingReminderDispatchResult,
  BillingReminderTier,
  BillingRunResult,
} from "@/lib/billing/types"

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error("Missing STRIPE_SECRET_KEY")
    _stripe = new Stripe(key)
  }
  return _stripe
}

interface RpcCapableClient {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
}

function getDaysOverdue(dueDate: string, today: string): number {
  const due = new Date(dueDate)
  const now = new Date(today)
  return Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
}

function resolveReminderTier(issueDate: string, dueDate: string, today: string): BillingReminderTier {
  if (issueDate === today) return "issued"
  const daysOverdue = getDaysOverdue(dueDate, today)
  if (daysOverdue >= 7) return "reminder_3"
  if (daysOverdue >= 3) return "reminder_2"
  return "reminder"
}

function normalizeNotificationCandidate(row: Record<string, unknown>, today: string): BillingReminderCandidate | null {
  const subscriptionValue = Array.isArray(row.subscription_id) ? row.subscription_id[0] : row.subscription_id
  const subscriptionRecord = subscriptionValue && typeof subscriptionValue === "object" ? subscriptionValue as Record<string, unknown> : null
  const serviceValue = subscriptionRecord?.service_id
  const serviceRecord = Array.isArray(serviceValue) ? serviceValue[0] : serviceValue
  const projectValue = serviceRecord && typeof serviceRecord === "object" ? (serviceRecord as Record<string, unknown>).project_id : null
  const projectRecord = Array.isArray(projectValue) ? projectValue[0] : projectValue
  const clientValue = projectRecord && typeof projectRecord === "object" ? (projectRecord as Record<string, unknown>).client_id : null
  const clientRecord = Array.isArray(clientValue) ? clientValue[0] : clientValue

  if (!clientRecord || typeof clientRecord !== "object") {
    return null
  }

  const clientData = clientRecord as Record<string, unknown>
  const email = typeof clientData.email === "string" ? clientData.email : ""
  if (!email.trim()) {
    return null
  }

  const issueDate = String(row.issue_date ?? "")
  const dueDate = String(row.due_date ?? "")

  return {
    invoiceId: String(row.id ?? ""),
    invoiceNumber: String(row.invoice_number ?? ""),
    amount: Number(row.amount ?? 0),
    status: String(row.status ?? "issued"),
    issueDate,
    dueDate,
    clientName: typeof clientData.name === "string" ? clientData.name : "Client",
    email,
    notificationType: resolveReminderTier(issueDate, dueDate, today),
  }
}

export async function executeBillingAutomation(runAt?: string): Promise<BillingRunResult> {
  const admin = getSupabaseAdmin() as unknown as RpcCapableClient
  const { data, error } = await admin.rpc("run_billing_automation", {
    p_run_at: runAt ?? new Date().toISOString(),
  })

  if (error) {
    throw error
  }

  const result = Array.isArray(data) ? data[0] : data
  const resultRecord = result && typeof result === "object" ? result as Record<string, unknown> : {}

  return {
    invoicesGenerated: Number(resultRecord.invoices_generated ?? 0),
    invoicesOverdue: Number(resultRecord.invoices_overdue ?? 0),
    subscriptionsSuspended: Number(resultRecord.subscriptions_suspended ?? 0),
  }
}

async function fetchNotificationCandidates(runAt = new Date().toISOString()) {
  const admin = getSupabaseAdmin()
  const today = runAt.slice(0, 10)
  const inThreeDays = new Date(runAt)
  inThreeDays.setUTCDate(inThreeDays.getUTCDate() + 3)
  // Also pick up invoices 3+ days overdue (reminder_2) and 7+ days overdue (reminder_3)
  const threeDaysAgo = new Date(runAt)
  threeDaysAgo.setUTCDate(threeDaysAgo.getUTCDate() - 3)

  const { data, error } = await admin
    .from("invoices")
    .select("id, invoice_number, amount, status, issue_date, due_date, subscription_id(service_id(project_id(client_id(name, email))))")
    .in("status", ["issued", "overdue"])
    .or(
      `issue_date.eq.${today},` +
      `and(status.eq.issued,due_date.gte.${today},due_date.lte.${inThreeDays.toISOString().slice(0, 10)}),` +
      `and(status.eq.overdue,due_date.lte.${threeDaysAgo.toISOString().slice(0, 10)})`
    )
    .order("due_date", { ascending: true })

  if (error) {
    throw error
  }

  const candidates = ((data ?? []) as Array<Record<string, unknown>>)
    .map((row) => normalizeNotificationCandidate(row, today))
    .filter((candidate): candidate is BillingReminderCandidate => Boolean(candidate))

  const uniqueCandidates = new Map<string, BillingReminderCandidate>()
  for (const candidate of candidates) {
    const existing = uniqueCandidates.get(candidate.invoiceId)
    if (!existing || existing.notificationType !== "issued") {
      uniqueCandidates.set(candidate.invoiceId, candidate)
    }
  }

  return Array.from(uniqueCandidates.values())
}

export async function sendBillingNotifications(runAt?: string): Promise<BillingReminderDispatchResult> {
  const effectiveRunAt = runAt ?? new Date().toISOString()
  const candidates = await fetchNotificationCandidates(effectiveRunAt)

  let notificationsSent = 0
  let skipped = 0

  for (const candidate of candidates) {
    try {
      const common = {
        to: candidate.email,
        clientName: candidate.clientName,
        invoiceNumber: candidate.invoiceNumber,
        amountLabel: formatCurrency(candidate.amount),
        dueDate: candidate.dueDate,
      }
      if (candidate.notificationType === "issued") {
        await sendIssuedInvoiceNotification({ ...common, statusLabel: candidate.status })
      } else if (candidate.notificationType === "reminder_3") {
        const days = getDaysOverdue(candidate.dueDate, effectiveRunAt.slice(0, 10))
        await sendInvoiceReminder3({ ...common, daysOverdue: days })
      } else if (candidate.notificationType === "reminder_2") {
        const days = getDaysOverdue(candidate.dueDate, effectiveRunAt.slice(0, 10))
        await sendInvoiceReminder2({ ...common, daysOverdue: days })
      } else {
        await sendInvoiceReminder({ ...common, statusLabel: candidate.status })
      }
      notificationsSent += 1
    } catch {
      skipped += 1
    }
  }

  return {
    notificationsSent,
    skipped,
  }
}

/**
 * Retry failed Stripe payments for overdue invoices that have a stripe_invoice_id.
 * Calls stripe.invoices.pay() for each open Stripe invoice.
 * Logs results to payment_retry_logs.
 */
export async function retryFailedPayments(): Promise<{ retried: number; succeeded: number; failed: number }> {
  const admin = getSupabaseAdmin()

  // Find overdue invoices with a stripe_invoice_id and no successful payment
  const { data: candidates, error } = await admin
    .from("invoices")
    .select("id, stripe_invoice_id")
    .eq("status", "overdue")
    .not("stripe_invoice_id", "is", null)
    .limit(50)

  if (error || !candidates?.length) return { retried: 0, succeeded: 0, failed: 0 }

  const stripe = getStripe()
  let succeeded = 0
  let failed = 0

  for (const inv of candidates as Array<{ id: string; stripe_invoice_id: string }>) {
    try {
      await stripe.invoices.pay(inv.stripe_invoice_id, { forgive: true })
      succeeded++
      void admin.from("payment_retry_logs").insert({
        invoice_id: inv.id,
        stripe_invoice_id: inv.stripe_invoice_id,
        status: "success",
      } as never).then(() => undefined, () => undefined)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      failed++
      void admin.from("payment_retry_logs").insert({
        invoice_id: inv.id,
        stripe_invoice_id: inv.stripe_invoice_id,
        status: "failed",
        error_message: msg.slice(0, 500),
      } as never).then(() => undefined, () => undefined)
    }
  }

  return { retried: candidates.length, succeeded, failed }
}

/**
 * After run_billing_automation executes, query subscriptions that were
 * suspended in the last run window and fire suspension emails.
 * Fire-and-forget: failures are caught and counted in skipped.
 */
export async function sendSuspensionNotifications(runAt = new Date().toISOString()): Promise<{ sent: number; skipped: number }> {
  const admin = getSupabaseAdmin()

  // Newly suspended = suspended_at within last hour (covers cron window + manual runs)
  const windowStart = new Date(new Date(runAt).getTime() - 60 * 60 * 1000).toISOString()

  const { data, error } = await admin
    .from("subscriptions")
    .select(`
      id,
      service:services(
        name,
        project:projects(
          name,
          client:clients(name, email)
        )
      )
    `)
    .eq("status", "suspended")
    .gte("suspended_at", windowStart)

  if (error || !data) return { sent: 0, skipped: 0 }

  let sent = 0
  let skipped = 0

  for (const row of data as Array<Record<string, unknown>>) {
    try {
      const svc = (Array.isArray(row.service) ? row.service[0] : row.service) as Record<string, unknown> | undefined
      const proj = svc ? (Array.isArray(svc.project) ? svc.project[0] : svc.project) as Record<string, unknown> | undefined : undefined
      const client = proj ? (Array.isArray(proj.client) ? proj.client[0] : proj.client) as Record<string, unknown> | undefined : undefined

      if (!client?.email) { skipped++; continue }

      await sendSubscriptionSuspendedEmail({
        to: String(client.email),
        clientName: String(client.name ?? "Client"),
        projectName: String(proj?.name ?? ""),
        serviceName: String(svc?.name ?? ""),
      })

      sent++
    } catch {
      skipped++
    }
  }

  return { sent, skipped }
}
