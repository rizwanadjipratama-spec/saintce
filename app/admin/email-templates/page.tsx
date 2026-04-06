"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { hasAdminAccess } from "@/lib/admin-auth"

interface EmailTemplate {
  id: string
  name: string
  trigger: string
  subject: string
  variables: string[]
  description: string
}

const TEMPLATES: EmailTemplate[] = [
  {
    id: "issued",
    name: "Invoice issued",
    trigger: "Billing cron — new invoice generated",
    subject: "Invoice {{invoiceNumber}} — {{amountLabel}}",
    variables: ["clientName", "invoiceNumber", "amountLabel", "dueDate", "statusLabel"],
    description: "Sent when a new invoice is issued for a subscription.",
  },
  {
    id: "reminder",
    name: "Payment reminder",
    trigger: "Billing cron — invoice approaching due date",
    subject: "Reminder: Invoice {{invoiceNumber}} due soon",
    variables: ["clientName", "invoiceNumber", "amountLabel", "dueDate", "statusLabel"],
    description: "First reminder, sent when invoice is due within 3 days.",
  },
  {
    id: "reminder_2",
    name: "Overdue notice (3d)",
    trigger: "Billing cron — invoice 3+ days overdue",
    subject: "Overdue: Invoice {{invoiceNumber}} — {{daysOverdue}} days past due",
    variables: ["clientName", "invoiceNumber", "amountLabel", "dueDate", "daysOverdue"],
    description: "Second reminder, sent when invoice is 3 or more days overdue.",
  },
  {
    id: "reminder_3",
    name: "Final notice (7d)",
    trigger: "Billing cron — invoice 7+ days overdue",
    subject: "Final notice: Invoice {{invoiceNumber}} — suspension imminent",
    variables: ["clientName", "invoiceNumber", "amountLabel", "dueDate", "daysOverdue"],
    description: "Final warning sent when invoice is 7+ days overdue. Suspension follows after grace period.",
  },
  {
    id: "payment_receipt",
    name: "Payment receipt",
    trigger: "Stripe webhook — payment_intent.succeeded",
    subject: "Payment received — Invoice {{invoiceNumber}}",
    variables: ["clientName", "invoiceNumber", "amountLabel", "paidAt", "paymentReference", "portalUrl"],
    description: "Sent to client after successful payment. Includes payment reference and portal link.",
  },
  {
    id: "payment_failed",
    name: "Payment failed",
    trigger: "Stripe webhook — payment_intent.payment_failed",
    subject: "Payment failed — Invoice {{invoiceNumber}}",
    variables: ["clientName", "invoiceNumber", "amountLabel"],
    description: "Sent when a Stripe payment attempt fails.",
  },
  {
    id: "subscription_suspended",
    name: "Subscription suspended",
    trigger: "Billing cron — grace period exceeded",
    subject: "Service suspended — {{serviceName}}",
    variables: ["clientName", "projectName", "serviceName"],
    description: "Sent when a subscription is suspended after grace period expires.",
  },
  {
    id: "subscription_reactivated",
    name: "Subscription reactivated",
    trigger: "Stripe webhook — payment after suspension",
    subject: "Service reactivated — {{serviceName}}",
    variables: ["clientName", "projectName", "serviceName"],
    description: "Sent when a suspended subscription is reactivated after payment.",
  },
  {
    id: "monthly_report",
    name: "Monthly revenue report",
    trigger: "Billing cron — 1st of month",
    subject: "Monthly revenue report — {{month}}",
    variables: ["adminName", "month", "totalRevenue", "mrr", "invoicesGenerated", "paymentReceived", "overdueCount", "suspendedCount"],
    description: "Sent to admin on the 1st of each month with revenue summary.",
  },
]

export default function AdminEmailTemplatesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const init = async () => {
      const allowed = await hasAdminAccess()
      if (!allowed) { router.replace("/login"); return }
      if (active) setLoading(false)
    }
    void init()
    return () => { active = false }
  }, [router])

  if (loading) return <div className="text-(--muted)">Loading...</div>

  const selectedTemplate = TEMPLATES.find((t) => t.id === selected)

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Notifications</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          Email templates
        </h1>
        <p className="mt-3 text-(--muted)">All outbound notification templates used by the system.</p>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        {/* Template list */}
        <section className="saintce-inset rounded-[28px] p-6">
          <div className="space-y-2">
            {TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => setSelected(tmpl.id === selected ? null : tmpl.id)}
                className={`w-full rounded-[18px] border px-4 py-4 text-left transition ${
                  selected === tmpl.id
                    ? "border-(--signal) bg-(--panel-subtle)"
                    : "border-(--border-soft) hover:border-(--signal)"
                }`}
              >
                <p className="text-sm text-(--text-primary)">{tmpl.name}</p>
                <p className="mt-1 text-xs text-(--muted)">{tmpl.trigger}</p>
              </button>
            ))}
          </div>
        </section>

        {/* Template detail */}
        <section className="saintce-inset rounded-[28px] p-6">
          {!selectedTemplate ? (
            <p className="text-(--muted)">Select a template to view details.</p>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-(--muted)">Template</p>
                <h2 className="mt-2 font-display text-2xl">{selectedTemplate.name}</h2>
                <p className="mt-2 text-sm text-(--muted)">{selectedTemplate.description}</p>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-(--muted)">Trigger</p>
                <p className="rounded-[14px] border border-(--border-soft) px-4 py-3 text-sm text-(--text-primary)">
                  {selectedTemplate.trigger}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-(--muted)">Subject line</p>
                <p className="rounded-[14px] border border-(--border-soft) bg-(--panel-subtle) px-4 py-3 font-mono text-sm text-(--text-primary)">
                  {selectedTemplate.subject}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-(--muted)">Variables</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.variables.map((v) => (
                    <span
                      key={v}
                      className="rounded-[10px] border border-(--border-soft) bg-(--panel-subtle) px-3 py-1 font-mono text-xs text-(--signal)"
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[14px] border border-(--border-soft) bg-(--panel-subtle) px-4 py-4">
                <p className="mb-2 text-xs uppercase tracking-[0.14em] text-(--muted)">Implementation</p>
                <p className="font-mono text-xs text-(--muted)">lib/notifications/service.ts</p>
                <p className="mt-1 font-mono text-xs text-(--muted)">Transport: Resend via lib/notifications/repository.ts</p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
