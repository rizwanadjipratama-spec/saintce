import { getSupabaseAdmin } from "@/lib/supabase-admin"
import {
  sendTicketOpenedEmail,
  sendTicketReplyEmail,
  sendTicketAdminNotificationEmail,
} from "@/lib/notifications/service"
import { siteConfig, getBaseUrl } from "@/lib/site-config"
import { getErrorMessage } from "@/lib/errors"

interface NotifyBody {
  type: "ticket_opened" | "admin_reply"
  ticketId: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as NotifyBody | null
    if (!body?.type || !body?.ticketId) {
      return Response.json({ error: "Missing type or ticketId." }, { status: 400 })
    }

    const admin = getSupabaseAdmin()

    // Load ticket + client + latest comment
    const { data: ticket, error: ticketErr } = await admin
      .from("tickets")
      .select("id, subject, priority, client:clients(name, email)")
      .eq("id", body.ticketId)
      .maybeSingle()

    if (ticketErr || !ticket) {
      return Response.json({ error: "Ticket not found." }, { status: 404 })
    }

    const ticketRow = ticket as Record<string, unknown>
    const clientData = (Array.isArray(ticketRow.client) ? ticketRow.client[0] : ticketRow.client) as Record<string, unknown> | null

    if (!clientData?.email) {
      return Response.json({ error: "Client email not found." }, { status: 422 })
    }

    const clientEmail = String(clientData.email)
    const clientName = String(clientData.name ?? "Client")
    const ticketSubject = String(ticketRow.subject ?? "")
    const ticketId = String(ticketRow.id ?? "")
    const priority = String(ticketRow.priority ?? "normal")
    const portalUrl = `${getBaseUrl()}/app/tickets`

    if (body.type === "ticket_opened") {
      // Notify client + admin in parallel (fire-and-forget style — errors logged but not thrown)
      await Promise.allSettled([
        sendTicketOpenedEmail({ to: clientEmail, clientName, ticketSubject, ticketId, portalUrl }),
        sendTicketAdminNotificationEmail({
          to: siteConfig.contact.adminEmail,
          adminName: siteConfig.brand.adminName,
          clientName,
          ticketSubject,
          ticketId,
          priority,
        }),
      ])
      return Response.json({ success: true })
    }

    if (body.type === "admin_reply") {
      // Load the latest admin comment
      const { data: latestComment } = await admin
        .from("ticket_comments")
        .select("body")
        .eq("ticket_id", body.ticketId)
        .eq("author_type", "admin")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const replyBody = (latestComment as Record<string, unknown> | null)?.body
      if (!replyBody) {
        return Response.json({ error: "No admin comment found." }, { status: 422 })
      }

      await sendTicketReplyEmail({
        to: clientEmail,
        clientName,
        ticketSubject,
        replyBody: String(replyBody),
        portalUrl,
      })
      return Response.json({ success: true })
    }

    return Response.json({ error: "Unknown type." }, { status: 400 })
  } catch (err) {
    return Response.json({ error: getErrorMessage(err, "Notification failed.") }, { status: 500 })
  }
}
