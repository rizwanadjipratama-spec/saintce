"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { hasAdminAccess } from "@/lib/admin-auth"

interface MigrationEntry {
  file: string
  date: string
  description: string
  tables: string[]
  functions: string[]
  notes: string
}

const MIGRATIONS: MigrationEntry[] = [
  {
    file: "20260405_000001_create_saintce_core.sql",
    date: "2026-04-05",
    description: "Core platform schema",
    tables: ["clients", "projects", "services"],
    functions: [],
    notes: "Initial core entities: clients → projects → services chain.",
  },
  {
    file: "20260405_000002_reset_saintce_core_production.sql",
    date: "2026-04-05",
    description: "Production reset — RLS + security hardening",
    tables: [],
    functions: ["is_saintce_admin"],
    notes: "Added admin role system, RLS policies, admin_users table.",
  },
  {
    file: "20260405_000003_add_saintce_site_sections.sql",
    date: "2026-04-05",
    description: "CMS site sections",
    tables: ["site_sections"],
    functions: [],
    notes: "Content management for marketing site sections.",
  },
  {
    file: "20260405_000004_remove_saintce_metrics.sql",
    date: "2026-04-05",
    description: "Remove metrics table",
    tables: [],
    functions: [],
    notes: "Dropped unused metrics table, not needed for billing platform.",
  },
  {
    file: "20260405_000005_add_saintce_billing_platform.sql",
    date: "2026-04-05",
    description: "Full billing platform",
    tables: ["subscriptions", "invoices", "payments"],
    functions: ["get_next_invoice_number", "create_manual_invoice", "run_billing_automation", "can_access_project", "sync_project_and_service_access", "record_payment_and_sync", "write_audit_log"],
    notes: "Core billing: subscriptions → invoices → payments. Automation engine, audit log, access control.",
  },
  {
    file: "20260405_000006_add_stripe_billing_mapping.sql",
    date: "2026-04-05",
    description: "Stripe ID columns",
    tables: [],
    functions: [],
    notes: "Added stripe_customer_id, stripe_subscription_id, stripe_invoice_id, stripe_payment_intent_id across billing tables.",
  },
  {
    file: "20260405_000007_add_stripe_service_product_mapping.sql",
    date: "2026-04-05",
    description: "Stripe product/price mapping on services",
    tables: [],
    functions: [],
    notes: "stripe_product_id + stripe_price_id on services for recurring Stripe billing.",
  },
  {
    file: "20260405_000008_add_stripe_webhook_events.sql",
    date: "2026-04-05",
    description: "Stripe webhook event log",
    tables: ["stripe_webhook_events"],
    functions: [],
    notes: "Idempotent webhook event deduplication log.",
  },
  {
    file: "20260406_000009_add_client_portal.sql",
    date: "2026-04-06",
    description: "Client portal RLS",
    tables: [],
    functions: [],
    notes: "RLS policies scoped to client email — client only sees their own data.",
  },
  {
    file: "20260406_000010_add_automation_and_softdelete.sql",
    date: "2026-04-06",
    description: "Automation logs + soft delete",
    tables: ["automation_logs"],
    functions: [],
    notes: "automation_logs table, deleted_at on clients/projects/services, partial indexes, notes column on projects.",
  },
  {
    file: "20260406_000011_add_invoice_items.sql",
    date: "2026-04-06",
    description: "Invoice line items + notification logs",
    tables: ["invoice_items", "notification_logs"],
    functions: [],
    notes: "invoice_items: quantity * unit_price generated column. notification_logs: outbound email audit.",
  },
  {
    file: "20260406_000012_invoice_numbering_and_adjustments.sql",
    date: "2026-04-06",
    description: "Robust invoice numbering + adjustment invoices",
    tables: ["invoice_sequences", "adjustment_sequences", "payment_retry_logs"],
    functions: ["get_next_invoice_number (replaced)", "get_next_adjustment_number", "create_adjustment_invoice"],
    notes: "Atomic sequence via INSERT ON CONFLICT DO UPDATE. invoice_type enum: standard | adjustment | credit_note.",
  },
  {
    file: "20260406_000013_support_tickets.sql",
    date: "2026-04-06",
    description: "Support ticket system",
    tables: ["tickets", "ticket_comments"],
    functions: ["update_ticket_updated_at", "touch_ticket_on_comment"],
    notes: "Full client support: tickets + threaded comments, RLS for admin + portal clients.",
  },
  {
    file: "20260406_000014_discount_tax_refund_credit.sql",
    date: "2026-04-06",
    description: "Discount, Tax/VAT, Refunds, Client credits",
    tables: ["client_credits", "refunds"],
    functions: ["get_client_credit_balance"],
    notes: "invoices: discount_percent, discount_amount, tax_rate, tax_amount, subtotal, notes columns. refund_status enum.",
  },
]

export default function AdminMigrationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

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

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">System</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          Migration history
        </h1>
        <p className="mt-3 text-(--muted)">{MIGRATIONS.length} migrations — complete database change history.</p>
      </div>

      <section className="mt-8 saintce-inset rounded-[28px] p-6">
        <div className="space-y-3">
          {[...MIGRATIONS].reverse().map((m) => (
            <div key={m.file} className="rounded-[20px] border border-(--border-soft)">
              <button
                onClick={() => setExpanded(expanded === m.file ? null : m.file)}
                className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-(--muted)">{m.date}</p>
                  <p className="mt-1 text-sm text-(--text-primary)">{m.description}</p>
                </div>
                <span className="shrink-0 text-xs text-(--muted)">{expanded === m.file ? "▲" : "▼"}</span>
              </button>

              {expanded === m.file && (
                <div className="border-t border-(--border-soft) px-4 pb-4 pt-4">
                  <p className="mb-3 font-mono text-xs text-(--muted)">{m.file}</p>
                  {m.tables.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-1 text-xs uppercase tracking-[0.12em] text-(--muted)">Tables</p>
                      <div className="flex flex-wrap gap-2">
                        {m.tables.map((t) => (
                          <span key={t} className="rounded-[8px] border border-(--border-soft) bg-(--panel-subtle) px-2 py-1 font-mono text-xs text-(--text-primary)">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {m.functions.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-1 text-xs uppercase tracking-[0.12em] text-(--muted)">Functions</p>
                      <div className="flex flex-wrap gap-2">
                        {m.functions.map((f) => (
                          <span key={f} className="rounded-[8px] border border-(--border-soft) bg-(--panel-subtle) px-2 py-1 font-mono text-xs text-(--signal)">{f}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-(--muted)">{m.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
