import { Resend } from "resend"
import { siteConfig } from "@/lib/site-config"

const resend = new Resend(process.env.RESEND_API_KEY!)

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, string>

    const name = body.name?.trim()
    const email = body.email?.trim()
    const company = body.company?.trim()
    const website = body.website?.trim()
    const timeline = body.timeline?.trim()
    const budget = body.budget?.trim()
    const overview = body.overview?.trim()

    if (!name || !email || !overview) {
      return Response.json({ error: "Missing required fields." }, { status: 400 })
    }

    await resend.emails.send({
      from: `${siteConfig.brand.name} <onboarding@resend.dev>`,
      to: siteConfig.contact.email,
      replyTo: email,
      subject: `New Project Inquiry - ${siteConfig.brand.name}`,
      html: `
        <h2>New Project Inquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Company:</strong> ${escapeHtml(company || "-")}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Website:</strong> ${escapeHtml(website || "-")}</p>
        <p><strong>Timeline:</strong> ${escapeHtml(timeline || "-")}</p>
        <p><strong>Budget:</strong> ${escapeHtml(budget || "-")}</p>
        <hr />
        <p><strong>Project Overview:</strong></p>
        <p>${escapeHtml(overview)}</p>
      `,
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error("CONTACT API ERROR:", error)
    return Response.json({ error: "Internal error." }, { status: 500 })
  }
}
