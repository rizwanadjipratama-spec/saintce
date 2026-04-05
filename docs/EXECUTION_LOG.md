# Saintce — Execution Log

Semua AI yang bekerja di repo ini wajib append log ke file ini setiap selesai task.

---

## Format

```
---------------------------------------
Date:
AI:
Task:
Status:
Files Changed:
Database Migration:
Env Changes:
Test Performed:
Notes:
---------------------------------------
```

---

## Log

---------------------------------------
Date: 2026-04-05
AI: Claude
Task: Performance Hardening — Fast Scroll White Flash Fix + Production Config
Status: Done
Files Changed:
- app/globals.css (hapus scroll-behavior: smooth, will-change canvas, marquee GPU)
- components/providers/SiteRouteTransition.tsx (hapus permanent willChange)
- components/providers/SmoothScroll.tsx (lerp config, visibilitychange handler)
- next.config.ts (poweredByHeader, compress, security headers, cache headers)
- PROJECT_MAP.md (update section 10)
Database Migration: none
Env Changes: none
Test Performed: Code audit manual, logic trace rendering path
Notes:
  - Root cause white flash: scroll-behavior CSS + Lenis konflik + willChange permanent compositing layer
  - Canvas sekarang always on GPU layer via will-change + contain: strict
  - Lenis pakai lerp: 0.1 (lebih responsive), RAF stop saat tab hidden
---------------------------------------

---------------------------------------
Date: 2026-04-06
AI: Claude
Task: Client Portal — Auth, Dashboard, Projects, Subscriptions, Invoices, Pay via Stripe
Status: Done
Files Changed:
- supabase/migrations/20260406_000009_add_client_portal.sql (RLS client portal)
- lib/portal/auth.ts (client auth helpers)
- lib/portal/data.ts (client data access layer)
- app/portal/layout.tsx (portal shell)
- app/portal/login/page.tsx (magic link login)
- app/portal/page.tsx (dashboard)
- app/portal/projects/page.tsx (project list + status)
- app/portal/subscriptions/page.tsx (subscription list)
- app/portal/invoices/page.tsx (invoice list + pay button)
- app/portal/invoices/[id]/page.tsx (invoice detail + Stripe checkout)
- app/api/portal/checkout/route.ts (create Stripe checkout session dari client)
Database Migration: 20260406_000009_add_client_portal.sql
Env Changes: none (STRIPE_SECRET_KEY sudah ada)
Test Performed: Code review, flow trace auth + data access + RLS
Notes:
  - Client auth via Supabase magic link (email)
  - RLS: client hanya bisa lihat data mereka sendiri via email match ke clients.email
  - Data chain: auth.email → clients.email → projects → services → subscriptions → invoices
  - Pay button redirect ke Stripe Checkout session
  - Semua page server component kecuali yang butuh interaktivity
---------------------------------------

---------------------------------------
Date: 2026-04-05
AI: Claude
Task: Billing Automation — Notification Emails, Invoice PDF, Vercel Cron, Automation Logs, MRR, Soft Delete, Export CSV, Billing Overview Improvements
Status: Done
Files Changed:
- lib/notifications/service.ts (tambah sendPaymentSuccessEmail, sendPaymentFailedEmail, sendSubscriptionSuspendedEmail, sendSubscriptionReactivatedEmail)
- lib/stripe-server.ts (hook notification ke webhook handlers, tambah createPortalStripeCheckoutSession)
- lib/billing/server.ts (tambah sendSuspensionNotifications)
- lib/billing/types.ts (tambah mrr dan recentAutomationLogs ke BillingOverview interface)
- lib/billing/repository.ts (tambah mrrResult + automationLogsResult query, soft delete filters)
- app/api/billing/run/route.ts (export GET handler untuk Vercel cron, log ke automation_logs, panggil sendSuspensionNotifications)
- app/portal/invoices/[id]/page.tsx (tambah Print/PDF link)
- app/portal/invoices/[id]/print/page.tsx (BARU — print-friendly invoice page)
- app/admin/billing-overview/page.tsx (rewrite: fix Tailwind v4 syntax, tambah MRR card, automation logs section, export buttons)
- app/api/admin/export/route.ts (BARU — CSV export endpoint untuk clients dan invoices)
- vercel.json (BARU — daily cron 0 1 * * *)
- PROJECT_MAP.md (update section 14)
- docs/EXECUTION_LOG.md (file ini)
- task.md (update status checklist)
Database Migration: 20260406_000010_add_automation_and_softdelete.sql
  - automation_logs table + RLS
  - deleted_at column di clients, projects, services
  - Partial indexes WHERE deleted_at IS NULL
  - notes TEXT column di projects
  - RLS policies updated untuk exclude soft-deleted rows
Env Changes: none (semua env sudah ada dari session sebelumnya)
Test Performed: Code audit manual, flow trace billing cycle, notification chain review
Notes:
  - MRR formula: monthly subs × price, yearly subs × price/12
  - Notifications via fire-and-forget (void + catch) — tidak boleh block payment sync
  - Vercel cron hanya bisa kirim GET, jadi logic diextract ke shared runBillingCycle()
  - Export CSV: escapeCSV() handle comma/quote/newline di values
  - Print invoice: self-contained page (no layout), inline styles only, window.print()
  - Soft delete: deleted_at IS NULL filters di RLS + repository queries
---------------------------------------

---------------------------------------
Date: 2026-04-06
AI: Claude
Task: Session 5 — OVERVIEW.md update, Client Payment History, Payment Receipt Email
Status: Done
Files Changed:
- OVERVIEW.md (rewrite lengkap dengan client portal, email notifications, dashboard metrics, export)
- app/portal/payments/page.tsx (BARU — payment history page)
- lib/portal/data.ts (tambah PortalPayment interface + getPortalPayments function)
- components/portal/PortalShell.tsx (tambah Payments nav, ganti Subscriptions di mobile nav)
- lib/notifications/service.ts (tambah sendPaymentReceiptEmail dengan reference + paid date + portal link)
- lib/stripe-server.ts (ganti sendPaymentSuccessEmail → sendPaymentReceiptEmail di checkout handler)
- task.md (update status: client payment history, payment receipt email, notes per client)
- PROJECT_MAP.md (update section 14 dan tambah section 15)
- docs/EXECUTION_LOG.md (file ini)
Database Migration: none
Env Changes: none
Test Performed: Code review, flow trace receipt email → stripe-server → notifications service
Notes:
  - Notes per client sudah ada dari migration 000005 dan admin UI, tidak perlu tambahan
  - sendPaymentReceiptEmail lebih lengkap dari sendPaymentSuccessEmail: ada payment reference (Stripe PI ID), paid date, portal link
  - getPortalPayments pakai RLS — client hanya lihat payments milik mereka via invoice → subscription → service → project → client chain
  - Mobile nav hanya 4 slot: Dashboard, Projects, Invoices, Payments (Subscriptions accessible dari Projects page)
---------------------------------------
