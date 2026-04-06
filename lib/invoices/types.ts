export type InvoiceStatus = "draft" | "issued" | "paid" | "overdue" | "void"

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total: number
  sort_order: number
}

export interface InvoiceItemInput {
  description: string
  quantity: number
  unit_price: number
  sort_order?: number
}

export interface InvoiceRecord {
  id: string
  subscription_id: string
  invoice_number: string
  amount: number
  status: InvoiceStatus
  issue_date: string
  due_date: string
  paid_at: string | null
  created_at: string
  subscription?: {
    id: string
    status: string
    service?: {
      id: string
      name: string
      project?: {
        id: string
        name: string
        client?: {
          id: string
          name: string
        } | null
      } | null
    } | null
  } | null
}

export interface InvoiceFilters {
  status?: InvoiceStatus
  page?: number
  pageSize?: number
}

export interface InvoiceMutationInput {
  subscription_id: string
  amount: number
  issue_date: string
  due_date: string
  status?: InvoiceStatus
}
