"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getPortalSession } from "@/lib/portal/auth"
import { getPortalInvoiceById, getPortalClient, getPortalInvoiceItems, type PortalInvoice, type PortalClient, type PortalInvoiceItem } from "@/lib/portal/data"
import { formatCurrency } from "@/lib/utils"
import { siteConfig } from "@/lib/site-config"

export default function AppInvoicePrintPage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = typeof params.id === "string" ? params.id : null

  const [invoice, setInvoice] = useState<PortalInvoice | null>(null)
  const [client, setClient] = useState<PortalClient | null>(null)
  const [items, setItems] = useState<PortalInvoiceItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!invoiceId) { router.replace("/app/invoices"); return }
    const session = await getPortalSession()
    if (!session) { router.replace("/login"); return }

    const [inv, cli, lineItems] = await Promise.all([
      getPortalInvoiceById(invoiceId),
      getPortalClient(session.email),
      getPortalInvoiceItems(invoiceId),
    ])

    if (!inv) { router.replace("/app/invoices"); return }

    setInvoice(inv)
    setClient(cli)
    setItems(lineItems)
    setLoading(false)
  }, [invoiceId, router])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [load])

  if (loading || !invoice) {
    return <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>Loading...</div>
  }

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { margin: 0; font-family: 'Arial', sans-serif; background: white; color: #111; }
        .invoice-page { max-width: 760px; margin: 0 auto; padding: 48px 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 24px; margin-bottom: 32px; }
        .brand { font-size: 1.5rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
        .invoice-meta { text-align: right; }
        .invoice-meta h1 { font-size: 2rem; margin: 0; font-weight: 700; }
        .invoice-meta p { margin: 4px 0; font-size: 0.9rem; color: #555; }
        .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
        .party-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.14em; color: #888; margin-bottom: 6px; }
        .party-name { font-size: 1rem; font-weight: 700; }
        .party-sub { font-size: 0.9rem; color: #555; margin-top: 2px; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
        .items-table th { text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; color: #888; border-bottom: 1px solid #ddd; padding: 8px 0; }
        .items-table td { padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 0.95rem; }
        .items-table td:last-child { text-align: right; }
        .totals { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
        .totals-row { display: flex; gap: 48px; font-size: 0.95rem; }
        .totals-row.total { font-size: 1.2rem; font-weight: 700; border-top: 2px solid #111; padding-top: 8px; margin-top: 4px; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700; }
        .status-paid { background: #dcfce7; color: #166534; }
        .status-issued { background: #fef9c3; color: #854d0e; }
        .status-overdue { background: #fee2e2; color: #991b1b; }
        .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #ddd; font-size: 0.82rem; color: #888; }
        .print-btn { position: fixed; bottom: 24px; right: 24px; background: #111; color: #fff; border: none; border-radius: 8px; padding: 12px 24px; font-size: 0.9rem; font-weight: 600; cursor: pointer; }
        .back-btn { position: fixed; bottom: 24px; left: 24px; background: transparent; color: #555; border: 1px solid #ddd; border-radius: 8px; padding: 12px 24px; font-size: 0.9rem; cursor: pointer; }
      `}</style>

      <div className="invoice-page">
        <div className="header">
          <div>
            <div className="brand">{siteConfig.brand.name}</div>
            <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "6px" }}>{siteConfig.contact.email}</div>
          </div>
          <div className="invoice-meta">
            <h1>Invoice</h1>
            <p>{invoice.invoice_number}</p>
            <p>Issued {invoice.issue_date}</p>
            <p>Due {invoice.due_date}</p>
          </div>
        </div>

        <div className="parties">
          <div>
            <div className="party-label">From</div>
            <div className="party-name">{siteConfig.brand.name}</div>
            <div className="party-sub">{siteConfig.contact.email}</div>
          </div>
          <div>
            <div className="party-label">Bill to</div>
            <div className="party-name">{client?.name ?? invoice.project_name}</div>
            {client?.company_name && <div className="party-sub">{client.company_name}</div>}
            {client?.email && <div className="party-sub">{client.email}</div>}
          </div>
        </div>

        <table className="items-table">
          <thead>
            <tr>
              <th>Description</th>
              {items.length > 0 && <><th style={{ textAlign: "right" }}>Qty</th><th style={{ textAlign: "right" }}>Unit price</th></>}
              <th style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? items.map((item) => (
              <tr key={item.id}>
                <td>{item.description}</td>
                <td style={{ textAlign: "right", color: "#666" }}>{item.quantity}</td>
                <td style={{ textAlign: "right", color: "#666" }}>{formatCurrency(item.unit_price)}</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(item.total)}</td>
              </tr>
            )) : (
              <tr>
                <td>{invoice.service_name} · {invoice.project_name}</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(invoice.amount)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="totals">
          <div className="totals-row total">
            <span>Total</span>
            <span>{formatCurrency(invoice.amount)}</span>
          </div>
          <div style={{ marginTop: "8px" }}>
            <span className={`status-badge status-${invoice.status}`}>{invoice.status}</span>
            {invoice.paid_at && (
              <span style={{ marginLeft: "12px", fontSize: "0.82rem", color: "#666" }}>
                Paid on {invoice.paid_at.slice(0, 10)}
              </span>
            )}
          </div>
        </div>

        <div className="footer">
          <p>Generated {today} · {siteConfig.brand.name}</p>
          <p>For questions, contact {siteConfig.contact.email}</p>
        </div>
      </div>

      <button className="no-print print-btn" onClick={() => window.print()}>
        Print / Save PDF
      </button>
      <button className="no-print back-btn" onClick={() => router.back()}>
        ← Back
      </button>
    </>
  )
}
