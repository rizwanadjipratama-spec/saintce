import { executeBillingAutomation, retryFailedPayments, sendBillingNotifications, sendSuspensionNotifications } from "@/lib/billing/server"
import { getErrorMessage } from "@/lib/errors"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { sendMonthlyRevenueReport } from "@/lib/notifications/service"
import { formatCurrency } from "@/lib/utils"
import { siteConfig } from "@/lib/site-config"

async function isAuthorized(request: Request) {
  const cronSecret = process.env.BILLING_CRON_SECRET
  const bearer = request.headers.get("authorization")
  const headerSecret = request.headers.get("x-cron-secret")

  if (cronSecret && (bearer === `Bearer ${cronSecret}` || headerSecret === cronSecret)) {
    return true
  }

  if (!bearer?.startsWith("Bearer ")) {
    return false
  }

  const token = bearer.replace("Bearer ", "").trim()
  if (!token) {
    return false
  }

  const admin = getSupabaseAdmin()
  const { data: authData, error: authError } = await admin.auth.getUser(token)

  if (authError || !authData.user) {
    return false
  }

  const { data: adminRow, error: adminError } = await admin
    .from("admin_users")
    .select("id")
    .eq("user_id", authData.user.id)
    .eq("is_active", true)
    .maybeSingle()

  if (adminError) {
    return false
  }

  return Boolean(adminRow)
}

async function runBillingCycle(request: Request, isGet = false) {
  try {
    if (!(await isAuthorized(request))) {
      return Response.json({ error: "Unauthorized." }, { status: 401 })
    }

    const body = isGet ? {} : (await request.json().catch(() => ({}))) as { runAt?: string }
    const runAt = (body as { runAt?: string }).runAt ?? new Date().toISOString()

    const startedAt = Date.now()
    const admin = getSupabaseAdmin()

    const automation = await executeBillingAutomation(runAt)
    const [notifications, suspensions, retries] = await Promise.all([
      sendBillingNotifications(runAt),
      sendSuspensionNotifications(runAt),
      retryFailedPayments(),
    ])

    // Fire monthly revenue report on the 1st of each month (fire-and-forget)
    const runDate = new Date(runAt)
    if (runDate.getUTCDate() === 1) {
      const month = runDate.toLocaleDateString("en-US", { year: "numeric", month: "long" })
      const startOfMonth = new Date(runDate.getFullYear(), runDate.getMonth(), 1).toISOString()
      void Promise.all([
        admin.from("payments").select("amount").eq("status", "paid").gte("paid_at", startOfMonth),
        admin.from("invoices").select("id", { count: "exact", head: true }).eq("status", "overdue"),
        admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "suspended"),
        admin.from("subscriptions").select("price, billing_interval").eq("status", "active"),
      ]).then(([paymentsRes, overdueRes, suspendedRes, mrrRes]) => {
        const monthRevenue = ((paymentsRes.data ?? []) as Array<Record<string, unknown>>).reduce((s, p) => s + Number(p.amount ?? 0), 0)
        const mrr = ((mrrRes.data ?? []) as Array<Record<string, unknown>>).reduce((s, sub) => {
          const price = Number(sub.price ?? 0)
          return s + (sub.billing_interval === "yearly" ? price / 12 : price)
        }, 0)
        void sendMonthlyRevenueReport({
          to: siteConfig.contact.adminEmail,
          adminName: siteConfig.brand.adminName,
          month,
          totalRevenue: formatCurrency(monthRevenue),
          mrr: formatCurrency(mrr),
          invoicesGenerated: automation.invoicesGenerated,
          paymentReceived: (paymentsRes.data ?? []).length,
          overdueCount: overdueRes.count ?? 0,
          suspendedCount: suspendedRes.count ?? 0,
        }).catch(() => undefined)
      }).catch(() => undefined)
    }

    // Log automation run to database
    void admin.from("automation_logs").insert({
      run_at: runAt,
      invoices_generated: automation.invoicesGenerated,
      invoices_overdue: automation.invoicesOverdue,
      subscriptions_suspended: automation.subscriptionsSuspended,
      notifications_sent: notifications.notificationsSent + suspensions.sent,
      notifications_skipped: notifications.skipped + suspensions.skipped,
      duration_ms: Date.now() - startedAt,
    } as never).then(() => undefined, () => undefined)

    return Response.json({
      success: true,
      runAt,
      automation,
      notifications: {
        notificationsSent: notifications.notificationsSent + suspensions.sent,
        skipped: notifications.skipped + suspensions.skipped,
      },
      retries,
    })
  } catch (error) {
    // Log error
    const admin = getSupabaseAdmin()
    void admin.from("automation_logs").insert({
      run_at: new Date().toISOString(),
      error_message: getErrorMessage(error, "Unknown error"),
      invoices_generated: 0,
      invoices_overdue: 0,
      subscriptions_suspended: 0,
      notifications_sent: 0,
      notifications_skipped: 0,
      duration_ms: 0,
    } as never).then(() => undefined, () => undefined)

    return Response.json({ error: getErrorMessage(error, "Unable to run billing automation.") }, { status: 500 })
  }
}

// POST — manual trigger from admin UI
export async function POST(request: Request) {
  return runBillingCycle(request, false)
}

// GET — Vercel cron trigger (cron can only send GET requests)
export async function GET(request: Request) {
  return runBillingCycle(request, true)
}
