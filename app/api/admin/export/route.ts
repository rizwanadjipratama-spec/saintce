import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { getErrorMessage } from "@/lib/errors"

async function isAuthorized(request: Request): Promise<boolean> {
  const bearer = request.headers.get("authorization")
  if (!bearer?.startsWith("Bearer ")) return false

  const token = bearer.replace("Bearer ", "").trim()
  if (!token) return false

  const admin = getSupabaseAdmin()
  const { data: authData, error: authError } = await admin.auth.getUser(token)
  if (authError || !authData.user) return false

  const { data: adminRow } = await admin
    .from("admin_users")
    .select("id")
    .eq("user_id", authData.user.id)
    .eq("is_active", true)
    .maybeSingle()

  return Boolean(adminRow)
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function toCSV(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const header = columns.join(",")
  const lines = rows.map((row) => columns.map((col) => escapeCSV(row[col])).join(","))
  return [header, ...lines].join("\r\n")
}

export async function GET(request: Request) {
  try {
    if (!(await isAuthorized(request))) {
      return new Response(JSON.stringify({ error: "Unauthorized." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    if (type !== "clients" && type !== "invoices") {
      return new Response(JSON.stringify({ error: "Invalid export type. Use ?type=clients or ?type=invoices." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const admin = getSupabaseAdmin()

    if (type === "clients") {
      const { data, error } = await admin
        .from("clients")
        .select("id, name, email, phone, company_name, created_at")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (error) throw error

      const columns = ["id", "name", "email", "phone", "company_name", "created_at"]
      const csv = toCSV((data ?? []) as Array<Record<string, unknown>>, columns)

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="clients-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
        },
      })
    }

    // type === "invoices"
    const { data, error } = await admin
      .from("invoices")
      .select("id, invoice_number, amount, status, issue_date, due_date, created_at")
      .order("created_at", { ascending: false })

    if (error) throw error

    const columns = ["id", "invoice_number", "amount", "status", "issue_date", "due_date", "created_at"]
    const csv = toCSV((data ?? []) as Array<Record<string, unknown>>, columns)

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="invoices-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: getErrorMessage(error, "Export failed.") }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
