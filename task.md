SAINTCE — MULTI AI EXECUTION SPEC
Production System Build Checklist & Workflow
Dokumen ini adalah master checklist dan execution log untuk pengembangan Saintce agar menjadi platform production-ready.
Digunakan oleh multiple AI agents (Claude, Codex, dll) secara bergantian.
RULE KOLABORASI AI (WAJIB)
Semua AI yang bekerja di repo ini harus mengikuti aturan berikut:
1. Task Status System
Setiap task harus punya status:
Plain text
[ ] Not Started
[~] In Progress (AI_NAME)
[x] Done (AI_NAME)
Contoh:
Plain text
[~] Implement invoice PDF generator — In Progress (Claude)
[x] Implement subscription automation — Done (Codex)
2. Wajib Update Execution Log
Setiap AI selesai kerja, harus update:

/docs/EXECUTION_LOG.md
Format log:
Plain text
Date:
AI:
Task:
Files changed:
Database changes:
Env changes:
Notes:
3. Dilarang
AI tidak boleh:
Merubah design system
Mengubah database tanpa migration
Menghapus tabel
Mengubah billing logic tanpa audit
Mengubah Stripe webhook flow sembarangan
Menyimpan secret di repo
Menghapus audit log
Mengubah automation tanpa logging
Mengubah status subscription manual tanpa function resmi
SAINTCE PRODUCTION READY CHECKLIST
MASTER CHECKLIST
1. CORE PLATFORM
Plain text
[x] Clients system
[x] Projects system
[x] Services system
[x] Subscriptions system
[x] Invoices system
[x] Payments system
[x] Stripe integration
[x] Billing automation
[x] Email invoice
[x] Webhook payment sync
[x] Access control (active / suspended)
[x] Audit logs
2. CLIENT PORTAL (VERY IMPORTANT)
Plain text
[x] Client authentication (Done — Claude)
[x] Client dashboard (Done — Claude)
[x] Client project list (Done — Claude)
[x] Client subscription list (Done — Claude)
[x] Client invoice list (Done — Claude)
[x] Client download invoice PDF (Done — Claude, print page at /portal/invoices/[id]/print)
[x] Client pay invoice (Done — Claude, via Stripe Checkout)
[x] Client payment history (Done — Claude, /portal/payments page with payment list)
[x] Client billing portal (Stripe) (Done — Claude, via existing stripe portal route)
[x] Client service status view (Done — Claude, shown in projects page)
[ ] Client upload files
[ ] Client contracts view
[x] Client support tickets (Done — Claude, /portal/tickets: create ticket + view + comment thread)
3. BILLING SYSTEM IMPROVEMENTS
Plain text
[x] Invoice PDF generator (Done — Claude, print page /portal/invoices/[id]/print with window.print())
[x] Invoice numbering system robust (Done — Claude, migration 000012: invoice_sequences table + atomic INSERT ON CONFLICT DO UPDATE, seeds from existing invoices)
[x] Invoice items breakdown (Done — Claude, invoice_items table + admin editor + portal detail + print page)
[x] Discount system (Done — Claude, migration 000014: discount_percent + discount_amount columns on invoices)
[x] Tax / VAT system (Done — Claude, migration 000014: tax_rate + tax_amount + subtotal columns on invoices)
[x] Credit / balance system (Done — Claude, client_credits table + /admin/credits page with balance view)
[x] Refund system (Done — Claude, refunds table + /admin/refunds page, record refunds against payments)
[x] Adjustment invoice (Done — Claude, migration 000012: invoice_type enum, create_adjustment_invoice DB function, ADJ-YYYY-NNNN numbering, /admin/adjustments page)
[x] Retry failed payment automation (Done — Claude, retryFailedPayments() in billing/server.ts: queries overdue invoices with stripe_invoice_id, calls stripe.invoices.pay(), logs to payment_retry_logs)
[x] Grace period logic (Done — grace_period_days column on subscriptions, used in run_billing_automation DB function)
[x] Multi reminder email system (Done — 3-tier: reminder, reminder_2 (3d overdue), reminder_3 (7d overdue))
[x] Payment receipt email (Done — Claude, sendPaymentReceiptEmail with reference + paid date + portal link)
[x] Subscription upgrade / downgrade (Done — Claude, edit plan panel per subscription with price + billing_interval, updateSubscriptionPlan in service)
4. BILLING AUTOMATION ENGINE
Plain text
[x] Daily billing cron (Done — Claude, vercel.json + GET handler in /api/billing/run)
[x] Generate recurring invoices (Done — database function run_billing_automation)
[x] Mark overdue invoices (Done — database function run_billing_automation)
[x] Send invoice reminders (Done — lib/billing/server.ts sendBillingNotifications)
[x] Suspend overdue subscriptions (Done — database function run_billing_automation)
[x] Reactivate after payment (Done — Stripe webhook + record_payment_and_sync)
[x] Retry failed payments (Done — Claude, runs automatically in billing cron alongside notifications + suspensions)
[x] Send monthly revenue report (Done — Claude, sendMonthlyRevenueReport fires on 1st of month in billing run)
[x] Automation run logs (Done — Claude, automation_logs table + logged in /api/billing/run)
[x] Automation error logs (Done — Claude, error_message column in automation_logs)
5. ACCESS CONTROL ENGINE
Plain text
[x] Project access guard (Done — can_access_project DB function)
[x] Service access guard (Done — sync_project_and_service_access DB function)
[x] Subscription status check middleware (Done — Claude, proxy.ts guards portal routes + rate limits API)
[x] Suspended project blocking (Done — access_blocked flag on projects)
[x] Reactivation after payment (Done — Stripe webhook sync)
6. ADMIN PLATFORM IMPROVEMENTS
Plain text
[x] Billing overview dashboard (Done — /admin/billing-overview)
[x] Revenue chart (Done — Claude, CSS bar chart on /admin/revenue showing % of total per client)
[x] MRR calculation (Done — Claude, in billing overview: monthly + yearly/12)
[x] Overdue invoices list (Done — Claude, panel in billing-overview with client/project name)
[x] Suspended subscriptions list (Done — Claude, panel in billing-overview with client/service/project)
[x] Recent payments list (Done — existing panel in billing-overview)
[x] Activity timeline (Done — Claude, /admin/activity page querying audit_logs with filter + change summary)
[x] Client activity history (Done — Claude, /admin/clients/[id]/activity page with full audit trail + Activity button on each client row)
[x] Manual adjustments (Done — Claude, /admin/adjustments page: create adjustment invoice or credit note with custom amount per subscription)
[x] Notes per client (Done — notes column in clients table + textarea in admin clients form)
[x] Notes per project (Done — Claude, notes TEXT column added in migration 000010)
7. FILE & CONTRACT MANAGEMENT
Plain text
[ ] File upload per client
[ ] File upload per project
[ ] Contract upload
[ ] Contract status
[ ] File storage (Supabase storage)
[ ] File access permissions
8. SUPPORT SYSTEM
Plain text
[x] Support ticket system (Done — Claude, tickets + ticket_comments tables, /admin/tickets, /portal/tickets)
[x] Ticket status (Done — open | in_progress | waiting | resolved | closed, admin can change)
[x] Ticket priority (Done — low | normal | high | urgent, admin can change)
[x] Ticket comments (Done — threaded comments with admin/client author_type distinction)
[ ] Ticket email notification
9. NOTIFICATION SYSTEM
Plain text
[x] Notification table (Done — Claude, notification_logs table in migration 000011)
[x] Email notification templates (Done — Claude, /admin/email-templates page: all 9 templates with trigger, subject, variables, implementation pointer)
[x] Invoice email (Done — lib/billing/server.ts sendIssuedInvoiceNotification)
[x] Payment success email (Done — Claude, sendPaymentSuccessEmail via Stripe webhook)
[x] Payment failed email (Done — Claude, sendPaymentFailedEmail via Stripe webhook)
[x] Subscription suspended email (Done — Claude, sendSubscriptionSuspendedEmail via billing automation)
[x] Subscription reactivated email (Done — Claude, sendSubscriptionReactivatedEmail via Stripe webhook)
[x] Reminder email 1 (Done — lib/billing/server.ts sendBillingNotifications)
[x] Reminder email 2 (Done — Claude, sendInvoiceReminder2 for invoices 3+ days overdue)
[x] Reminder email 3 (Done — Claude, sendInvoiceReminder3 final notice for invoices 7+ days overdue)
10. LOGGING & MONITORING
Plain text
[x] System logs (Done — Claude, /admin/system-logs page: tabbed view — billing cron runs, Stripe webhooks, payment retry logs)
[x] Billing logs (Done — automation_logs table captures all billing cycle results)
[x] Webhook logs (Done — stripe_webhook_events table captures all webhook events)
[x] Email logs (Done — Claude, /admin/email-logs page querying notification_logs with status filter)
[x] Automation logs (Done — Claude, automation_logs table + UI in billing-overview)
[x] Error logs (Done — error_message column in automation_logs)
[x] Stripe event logs (Done — stripe_webhook_events table + shown in billing overview)
[x] Admin activity logs (Done — Claude, audit_logs table + /admin/activity page with table filter)
[x] Client activity logs (Done — Claude, /admin/clients/[id]/activity page, audit_logs filtered by client_id + child records)
11. SECURITY
Plain text
[x] Supabase RLS policies (Done — admin + client portal RLS)
[x] Admin role system (Done — is_saintce_admin() function + admin_users table)
[x] Client role system (Done — client portal RLS via email match)
[ ] Permission per project
[x] Webhook signature verification (Done — Stripe webhook signature verify)
[x] Rate limiting API (Done — Claude, in-memory rate limiter in proxy.ts: contact 5/min, checkout 10/min, export 20/min)
[x] Input validation (Done — contact form + billing API routes)
[x] HTML sanitization (Done — contact form API route)
[ ] File upload validation
[x] Soft delete system (Done — Claude, deleted_at on clients/projects/services + partial indexes)
[x] Audit log for all critical changes (Done — write_audit_log trigger on all billing tables)
12. BACKUP & RECOVERY
Plain text
[ ] Daily database backup
[ ] File backup
[x] Invoice export (Done — Claude, /api/admin/export?type=invoices CSV download)
[x] Client export (Done — Claude, /api/admin/export?type=clients CSV download)
[ ] Restore procedure documentation
[x] Migration history (Done — Claude, /admin/migrations page: all 14 migrations with tables/functions/notes, collapsible)
13. INFRASTRUCTURE / DEPLOYMENT
Plain text
[ ] Production environment
[ ] Staging environment
[x] Cron scheduler deployed (Done — Claude, vercel.json cron 0 1 * * * → /api/billing/run)
[ ] Stripe live mode
[ ] Webhook live endpoint
[ ] Email domain verified
[ ] Error monitoring
[ ] Uptime monitoring
[ ] Analytics
14. ANALYTICS & BUSINESS
Plain text
[x] Revenue dashboard (Done — Claude, /admin/revenue page with total + per client + per project)
[x] Revenue per client (Done — Claude, /admin/revenue grouped by client with payment count)
[x] Revenue per project (Done — Claude, /admin/revenue grouped by project)
[x] Monthly recurring revenue (Done — MRR stat card in billing-overview: monthly + yearly/12)
[x] Outstanding invoices (Done — overdue invoices list panel + count in stat cards)
[x] Client lifetime value (Done — Claude, avg CLV stat card on /admin/revenue + highest value client)
SAINTCE SYSTEM WORKFLOW (FINAL)
WORKFLOW CLIENT → BILLING → ACCESS
Plain text
Visitor open website
        ↓
Client deal / contact
        ↓
Admin create client
        ↓
Admin create project
        ↓
Admin add services
        ↓
Admin create subscription
        ↓
System generate invoice
        ↓
Invoice email sent
        ↓
Client pay via Stripe
        ↓
Stripe webhook
        ↓
Payment recorded
        ↓
Invoice paid
        ↓
Subscription active
        ↓
Project/service active
BILLING AUTOMATION WORKFLOW
Plain text
Daily cron run
      ↓
Check subscriptions billing date
      ↓
Generate invoices
      ↓
Send invoice emails
      ↓
Check overdue invoices
      ↓
Send reminders
      ↓
If overdue + grace period
      ↓
Suspend subscription
      ↓
Block service access
      ↓
If payment received
      ↓
Reactivate subscription
      ↓
Enable service access
EXECUTION LOG TEMPLATE (WAJIB)
File: /docs/EXECUTION_LOG.md
Template:
Plain text
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
Contoh:
Plain text
Date: 2026-04-06
AI: Claude
Task: Invoice PDF generator
Status: Done
Files Changed:
- lib/invoices/pdf.ts
- app/api/invoices/pdf/route.ts
Database Migration: none
Env Changes: none
Test Performed: Generated sample PDF
Notes: Using PDFKit
RULE FINAL UNTUK SEMUA AI
Semua AI harus memastikan:
Plain text
No memory leak
No N+1 queries
Use transactions for billing
Use indexes on foreign keys
Use soft delete
Use audit logs
Use typed data layer
Do not break existing UI
Do not break billing logic
Do not duplicate logic
All automation logged
All webhook events logged
All critical actions audited
System must be idempotent
FINAL GOAL SAINTCE PLATFORM
Setelah semua checklist selesai, Saintce harus menjadi:
Plain text
Marketing Website
CMS
Admin Panel
Client Portal
Client Management
Project Management
Service Management
Subscription Billing
Invoice System
Payment System
Automation Engine
Notification System
Access Control
File Storage
Contract Management
Support Tickets
Analytics
Audit Logs
Monitoring
Backup


1. SAINTCE ADALAH SISTEM APA
Saintce bukan hanya website atau admin panel.
Saintce adalah platform untuk menjalankan bisnis software / ERP / website berbasis subscription.
Saintce mengelola:
Klien
Project
Layanan
Subscription
Invoice
Pembayaran
Aktivasi / suspend layanan
Billing automation
Email notifikasi
Client portal
Admin control panel
Saintce berfungsi sebagai:
Operating system untuk software house / ERP provider berbasis subscription.
2. ENTITY RELATION YANG WAJIB DIPAHAMI SEMUA AI
Semua AI harus mengerti relasi utama sistem:
Plain text
Client
  ↓
Project
  ↓
Service
  ↓
Subscription
  ↓
Invoice
  ↓
Payment
  ↓
Access (Active / Suspended)
JANGAN PERNAH membuat invoice langsung dari client.
JANGAN PERNAH membuat subscription langsung dari client.
Semua harus melalui chain di atas.
3. WORKFLOW ADMIN DARI AWAL SAMPAI AKHIR
Ini alur kerja admin yang harus bisa dilakukan di Saintce.
Workflow Setup Client Baru
Plain text
Admin login
   ↓
Admin buka Admin Panel
   ↓
Admin masuk menu Clients
   ↓
Admin create client (nama, email, company, phone)
   ↓
Admin masuk menu Projects
   ↓
Admin create project untuk client
   ↓
Admin masuk menu Services
   ↓
Admin add service ke project (misal Hosting / ERP / Maintenance)
   ↓
Admin set price dan billing interval
   ↓
Admin masuk menu Subscriptions
   ↓
Admin create subscription dari service
   ↓
Admin generate invoice pertama
   ↓
System kirim email invoice ke client
   ↓
Client bayar
   ↓
Subscription aktif
   ↓
Project / service aktif
AI harus memastikan semua flow ini bisa dilakukan dari admin panel.
4. WORKFLOW BILLING BULANAN (AUTOMATION)
Billing automation harus bekerja seperti ini:
Plain text
Setiap hari cron jalan
      ↓
System cek semua subscription
      ↓
Jika next_billing_date hari ini
      ↓
Generate invoice
      ↓
Kirim email invoice
      ↓
Tunggu pembayaran
      ↓
Jika lewat due date
      ↓
Invoice = overdue
      ↓
Kirim reminder email
      ↓
Jika lewat grace period
      ↓
Subscription = suspended
      ↓
Project/service access = blocked
      ↓
Jika client bayar
      ↓
Webhook Stripe
      ↓
Invoice = paid
      ↓
Subscription = active
      ↓
Project/service active lagi
Automation ini harus bisa dijalankan dari:

/api/billing/run
Dan juga dari cron scheduler.
5. WORKFLOW CLIENT PORTAL
Client portal harus punya flow seperti ini:
Plain text
Client login
      ↓
Client dashboard
      ↓
Client lihat project
      ↓
Client lihat subscription
      ↓
Client lihat invoice
      ↓
Client klik Pay
      ↓
Redirect ke Stripe Checkout
      ↓
Client bayar
      ↓
Stripe webhook
      ↓
Invoice paid
      ↓
Subscription active
Client juga harus bisa:
Download invoice PDF
Lihat payment history
Update payment method (Stripe Billing Portal)
6. STRIPE FLOW YANG HARUS DIPAHAMI AI
Stripe digunakan untuk:
Checkout invoice
Recurring subscription payment
Billing portal
Webhook payment success
Webhook payment failed
Stripe Checkout Flow
Plain text
Admin / Client create payment
      ↓
System create Stripe Checkout Session
      ↓
Client redirect ke Stripe
      ↓
Client bayar
      ↓
Stripe kirim webhook
      ↓
Webhook endpoint menerima event
      ↓
System record payment
      ↓
Invoice paid
      ↓
Subscription active
Endpoint penting:
Plain text
/api/payments/stripe/checkout
/api/payments/stripe/webhook
AI harus memastikan webhook:
Verified signature
Idempotent
Logged
Update invoice
Update subscription
Update project access
7. ACCESS CONTROL FLOW
Setiap ERP / website / service harus dicek subscription status.
Logic:
Plain text
If subscription active → allow access
If past_due → allow but show warning
If suspended → block access
If cancelled → block access
Harus ada function:

can_access_project(project_id)
Ini digunakan di semua service.
8. DESIGN RULE (SANGAT PENTING)
Semua AI harus mengikuti rule design ini:
Plain text
Jangan ubah design system
Jangan ubah typography
Jangan ubah spacing
Jangan ubah layout structure
Jangan ubah animation style
Gunakan UI components yang sudah ada
Gunakan panel skeuomorphic Saintce style
Gunakan dark premium theme
Jangan buat UI yang tidak konsisten
Saintce design harus tetap:
Dark premium
Panel layered
Glass effect
Soft glow
Smooth animation
Editorial spacing
Minimal modern SaaS
Premium enterprise feel
Target design feel:
Enterprise SaaS seperti Oracle / Stripe / Linear / Vercel dashboard
9. RULE ENGINEERING UNTUK SEMUA AI
Semua AI harus memastikan:
Plain text
No memory leaks
No N+1 queries
Use transactions for billing
Use indexes on foreign keys
Use soft delete
Use audit logs
All automation logged
All webhook events logged
All critical actions audited
System must be idempotent
Use typed TypeScript everywhere
Do not duplicate logic
Do not put heavy logic in React components
Use server actions / API routes for business logic
10. GOAL AKHIR SISTEM (SEMUA AI HARUS PAHAM)
Saintce setelah selesai harus menjadi sistem yang bisa:
Plain text
Admin manage clients
Admin manage projects
Admin manage services
Admin manage subscriptions
Admin generate invoices
System send invoice automatically
Client pay via Stripe
Webhook update system
Subscription active/suspended otomatis
Service access controlled otomatis
Client login portal
Client lihat invoice & bayar
System kirim reminder otomatis
Admin lihat revenue dashboard
Semua aktivitas tercatat di audit log
Semua automation tercatat di log
System bisa jalan tanpa manual intervention
Kalau semua ini sudah bisa dilakukan → Saintce dianggap selesai sebagai production platform.
11. GAMBARAN BESAR SISTEM (HARUS DIPAHAMI AI)
Plain text
Saintce Platform
│
├── Marketing Website
├── CMS
├── Admin Panel
├── Client Portal
│
├── Clients
├── Projects
├── Services
├── Subscriptions
├── Invoices
├── Payments
│
├── Billing Engine
├── Automation Engine
├── Notification System
├── Email System
├── Stripe Integration
├── Access Control
├── File Storage
├── Contracts
├── Support Tickets
├── Audit Logs
├── Analytics
├── Backup
└── Monitoring
Semua AI harus mengerti bahwa mereka sedang membangun platform ini, bukan hanya fitur kecil.