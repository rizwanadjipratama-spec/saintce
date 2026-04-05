import { executeBillingAutomation, sendBillingNotifications, sendSuspensionNotifications } from "@/lib/billing/server"
import { getErrorMessage } from "@/lib/errors"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

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
    const [notifications, suspensions] = await Promise.all([
      sendBillingNotifications(runAt),
      sendSuspensionNotifications(runAt),
    ])

    // Log automation run to database
    void admin.from("automation_logs").insert({
      run_at: runAt,
      invoices_generated: automation.invoicesGenerated,
      invoices_overdue: automation.invoicesOverdue,
      subscriptions_suspended: automation.subscriptionsSuspended,
      notifications_sent: notifications.notificationsSent + suspensions.sent,
      notifications_skipped: notifications.skipped + suspensions.skipped,
      duration_ms: Date.now() - startedAt,
    } as never).then(() => undefined).catch(() => undefined)

    return Response.json({
      success: true,
      runAt,
      automation,
      notifications: {
        notificationsSent: notifications.notificationsSent + suspensions.sent,
        skipped: notifications.skipped + suspensions.skipped,
      },
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
    } as never).then(() => undefined).catch(() => undefined)

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
