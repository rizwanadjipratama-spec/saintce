import { supabase } from "@/lib/supabase"
import { listInvoices, markInvoiceStatus } from "@/lib/invoices/repository"
import type { InvoiceFilters, InvoiceItem, InvoiceItemInput, InvoiceMutationInput } from "@/lib/invoices/types"
import { validateInvoiceInput } from "@/lib/invoices/validation"

export async function getInvoices(filters: InvoiceFilters = {}) {
  return listInvoices(filters)
}

export async function generateInvoiceManually(input: InvoiceMutationInput) {
  const payload = validateInvoiceInput(input)
  const { data, error } = await supabase.rpc("create_manual_invoice", {
    p_subscription_id: payload.subscription_id,
    p_amount: payload.amount,
    p_issue_date: payload.issue_date,
    p_due_date: payload.due_date,
  })

  if (error) {
    throw error
  }

  return data
}

export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  const { data, error } = await supabase
    .from("invoice_items")
    .select("id, invoice_id, description, quantity, unit_price, total, sort_order")
    .eq("invoice_id", invoiceId)
    .order("sort_order", { ascending: true })

  if (error || !data) return []
  return (data as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ""),
    invoice_id: String(row.invoice_id ?? ""),
    description: String(row.description ?? ""),
    quantity: Number(row.quantity ?? 1),
    unit_price: Number(row.unit_price ?? 0),
    total: Number(row.total ?? 0),
    sort_order: Number(row.sort_order ?? 0),
  }))
}

export async function saveInvoiceItems(invoiceId: string, items: InvoiceItemInput[]): Promise<void> {
  // Replace all items for this invoice
  const { error: deleteError } = await supabase
    .from("invoice_items")
    .delete()
    .eq("invoice_id", invoiceId)

  if (deleteError) throw deleteError
  if (items.length === 0) return

  const rows = items.map((item, index) => ({
    invoice_id: invoiceId,
    description: item.description.trim(),
    quantity: item.quantity,
    unit_price: item.unit_price,
    sort_order: item.sort_order ?? index,
  }))

  const { error: insertError } = await supabase.from("invoice_items").insert(rows)
  if (insertError) throw insertError
}

export async function markInvoicePaid(invoiceId: string) {
  return markInvoiceStatus(invoiceId, "paid")
}

export async function voidInvoice(invoiceId: string) {
  return markInvoiceStatus(invoiceId, "void")
}
