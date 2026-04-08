"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { hasAdminAccess } from "@/lib/admin-auth"

interface CheckItem {
  label: string
  detail: string
  docs?: string
}

interface Section {
  title: string
  id: string
  items: CheckItem[]
}

const SECTIONS: Section[] = [
  {
    title: "Environment variables",
    id: "env",
    items: [
      { label: "NEXT_PUBLIC_SUPABASE_URL", detail: "Your Supabase project URL (Settings → API → Project URL)" },
      { label: "NEXT_PUBLIC_SUPABASE_ANON_KEY", detail: "Supabase anon/public key (Settings → API → anon key)" },
      { label: "SUPABASE_SERVICE_ROLE_KEY", detail: "Supabase service role key — keep secret, server-only" },
      { label: "STRIPE_SECRET_KEY", detail: "Stripe secret key (sk_live_... for production, sk_test_... for test)" },
      { label: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", detail: "Stripe publishable key (pk_live_... for production)" },
      { label: "STRIPE_WEBHOOK_SECRET", detail: "From Stripe Dashboard → Webhooks → your endpoint → Signing secret" },
      { label: "RESEND_API_KEY", detail: "Resend API key for transactional email (resend.com → API Keys)" },
      { label: "BILLING_CRON_SECRET", detail: "Random secret to secure /api/billing/run from unauthorized calls" },
      { label: "NEXT_PUBLIC_SITE_URL", detail: "Production URL e.g. https://saintce.com (no trailing slash)" },
    ],
  },
  {
    title: "Stripe setup",
    id: "stripe",
    items: [
      { label: "Switch to live mode", detail: "In Stripe Dashboard toggle from Test to Live. Get live keys sk_live_... and pk_live_..." },
      { label: "Create webhook endpoint", detail: "Stripe Dashboard → Developers → Webhooks → Add endpoint → URL: https://yourdomain.com/api/payments/webhook" },
      { label: "Enable webhook events", detail: "Events to enable: payment_intent.succeeded, payment_intent.payment_failed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed" },
      { label: "Copy webhook signing secret", detail: "After creating webhook endpoint, reveal the Signing secret → set as STRIPE_WEBHOOK_SECRET" },
      { label: "Create products in Stripe", detail: "Create products/prices in Stripe Dashboard to match your services. Set stripe_product_id + stripe_price_id on services in admin." },
    ],
  },
  {
    title: "Supabase setup",
    id: "supabase",
    items: [
      { label: "Run all migrations", detail: "Apply all 16 migration files in supabase/migrations/ in order using Supabase SQL Editor or CLI: supabase db push" },
      { label: "Create storage bucket", detail: "Supabase Dashboard → Storage → New bucket → Name: client-files → Private (not public)" },
      { label: "Set storage RLS policies", detail: "Authenticated users can upload to clients/{client_id}/* — add RLS on storage.objects for bucket client-files" },
      { label: "Configure auth", detail: "Supabase Dashboard → Auth → Email → Enable magic link. Set Site URL to production domain. Add redirect URLs." },
      { label: "Add admin user", detail: "Create auth user in Supabase Auth, then insert into admin_users table with required columns: INSERT INTO admin_users (user_id, email, role, is_active) VALUES (uuid, 'admin@yourdomain.com', 'admin', true)" },
      { label: "Enable realtime", detail: "Supabase Dashboard → Database → Replication → Enable for tables needing realtime: clients, tickets, notifications" },
    ],
  },
  {
    title: "Email (Resend)",
    id: "email",
    items: [
      { label: "Verify sending domain", detail: "Resend Dashboard → Domains → Add domain → Add DNS records (SPF, DKIM, DMARC). Wait for verification." },
      { label: "Update from address", detail: "In lib/notifications/repository.ts update the from: address to match your verified domain e.g. billing@yourdomain.com" },
      { label: "Test all email templates", detail: "Trigger each notification type manually to verify delivery: invoice, reminder x3, payment receipt, ticket opened, ticket reply, monthly report" },
    ],
  },
  {
    title: "Vercel deployment",
    id: "vercel",
    items: [
      { label: "Connect GitHub repo", detail: "Vercel Dashboard → New Project → Import Git Repository → Select saintce repo" },
      { label: "Set all environment variables", detail: "Vercel Dashboard → Project → Settings → Environment Variables → Add all env vars listed above" },
      { label: "Configure cron job", detail: "vercel.json already has cron configured: 0 1 * * * → /api/billing/run (runs daily at 01:00 UTC). Ensure BILLING_CRON_SECRET is set." },
      { label: "Set production domain", detail: "Vercel Dashboard → Project → Settings → Domains → Add your domain. Update NEXT_PUBLIC_SITE_URL." },
      { label: "Enable Vercel Analytics", detail: "Vercel Dashboard → Project → Analytics → Enable. Already integrated in app/layout.tsx via @vercel/analytics." },
      { label: "Enable Speed Insights", detail: "Already integrated via @vercel/speed-insights in app/layout.tsx." },
    ],
  },
  {
    title: "Database backup",
    id: "backup",
    items: [
      { label: "Supabase automatic backups", detail: "Supabase Pro/Team plans include daily automated backups with 7-day retention (Point-in-Time Recovery on Pro+). Dashboard → Database → Backups." },
      { label: "Manual backup (free plan)", detail: "supabase db dump -f backup_$(date +%Y%m%d).sql — run this from your local machine with Supabase CLI." },
      { label: "Export CSV data", detail: "Use /api/admin/export?type=invoices and ?type=clients to download CSV snapshots at any time from the admin panel." },
      { label: "Storage backup", detail: "Supabase Storage does not auto-backup on free plan. For production: enable Supabase Pro or script periodic downloads of client-files bucket." },
    ],
  },
  {
    title: "Restore procedure",
    id: "restore",
    items: [
      { label: "From Supabase backup", detail: "Supabase Dashboard → Database → Backups → Select date → Restore. Takes ~5 minutes. All data restored to selected point." },
      { label: "From SQL dump", detail: "psql $DATABASE_URL < backup_YYYYMMDD.sql — connect to your Supabase database using the connection string from Settings → Database → Connection string." },
      { label: "Re-run migrations after restore", detail: "If restoring to a clean database, run all migrations in order: supabase/migrations/20260405_000001 through 20260406_000016." },
      { label: "Verify after restore", detail: "1) Check admin_users table has your user. 2) Run /api/billing/run manually. 3) Test portal login. 4) Verify Stripe webhooks fire correctly." },
      { label: "Storage restore", detail: "If storage bucket is lost: files must be re-uploaded. The client_files metadata table will show what existed. Contact clients for re-upload if needed." },
    ],
  },
  {
    title: "Monitoring",
    id: "monitoring",
    items: [
      { label: "Vercel logs", detail: "Vercel Dashboard → Project → Deployments → Functions → Real-time log stream for all API routes and webhook handler." },
      { label: "Error monitoring (Sentry)", detail: "Install: npm install @sentry/nextjs — run: npx @sentry/wizard@latest -i nextjs — add SENTRY_DSN to env vars. Update app/error.tsx to call Sentry.captureException(error)." },
      { label: "Uptime monitoring", detail: "UptimeRobot (free): monitor https://yourdomain.com every 5 minutes. Add /api/billing/run health check monitor. Alert via email/Slack on downtime." },
      { label: "Billing automation health", detail: "Check /admin/system-logs → Billing cron tab daily to verify automation runs are succeeding. Set up UptimeRobot alert if /api/billing/run returns non-200." },
      { label: "Stripe webhook monitoring", detail: "Stripe Dashboard → Developers → Webhooks → your endpoint → shows delivery success rate and failed deliveries. Check /admin/system-logs → Stripe webhooks." },
    ],
  },
]

export default function AdminDeploymentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<string>("env")

  useEffect(() => {
    const restoreTimeoutId = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem("saintce-deployment-checklist")
        if (saved) setChecked(JSON.parse(saved) as Record<string, boolean>)
      } catch {
        // ignore malformed local storage
      }
    }, 0)

    let active = true
    const init = async () => {
      const allowed = await hasAdminAccess()
      if (!allowed) { router.replace("/login"); return }
      if (active) setLoading(false)
    }
    void init()
    return () => {
      active = false
      window.clearTimeout(restoreTimeoutId)
    }
  }, [router])

  const toggle = (key: string) => {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem("saintce-deployment-checklist", JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  const totalItems = SECTIONS.reduce((s, sec) => s + sec.items.length, 0)
  const checkedCount = Object.values(checked).filter(Boolean).length
  const pct = Math.round((checkedCount / totalItems) * 100)

  if (loading) return <div className="text-(--muted)">Loading...</div>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">System</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          Deployment
        </h1>
        <p className="mt-3 text-(--muted)">Production checklist — environment setup, backup, restore, and monitoring procedures.</p>
      </div>

      {/* Progress */}
      <div className="mt-8 saintce-inset rounded-[28px] p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-(--muted)">Checklist progress</p>
            <p className="mt-1 font-display text-4xl">{pct}%</p>
          </div>
          <p className="text-sm text-(--muted)">{checkedCount} / {totalItems} completed</p>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-(--border-soft)">
          <div className="h-full rounded-full bg-(--signal) transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Sections */}
      <div className="mt-6 space-y-4">
        {SECTIONS.map((section) => {
          const sectionChecked = section.items.filter((item) => checked[`${section.id}-${item.label}`]).length
          const isExpanded = expanded === section.id

          return (
            <section key={section.id} className="saintce-inset rounded-[28px]">
              <button
                onClick={() => setExpanded(isExpanded ? "" : section.id)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <h2 className="font-display text-xl">{section.title}</h2>
                    <p className="mt-1 text-xs text-(--muted)">{sectionChecked}/{section.items.length} done</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {sectionChecked === section.items.length && (
                    <span className="text-xs text-emerald-400">✓ Complete</span>
                  )}
                  <span className="text-sm text-(--muted)">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-(--border-soft) px-6 pb-6 pt-4">
                  <div className="space-y-3">
                    {section.items.map((item) => {
                      const key = `${section.id}-${item.label}`
                      const done = Boolean(checked[key])
                      return (
                        <div
                          key={item.label}
                          onClick={() => toggle(key)}
                          className={`cursor-pointer rounded-[18px] border px-4 py-4 transition ${
                            done ? "border-emerald-500/30 bg-emerald-950/20" : "border-(--border-soft) hover:border-(--signal)"
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${done ? "border-emerald-400 bg-emerald-400" : "border-(--muted)"}`} />
                            <div className="min-w-0">
                              <p className={`text-sm font-mono ${done ? "text-(--muted) line-through" : "text-(--text-primary)"}`}>{item.label}</p>
                              <p className="mt-1 text-xs text-(--muted)">{item.detail}</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
