"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getPortalSession } from "@/lib/portal/auth"
import { getPortalPayments, type PortalPayment } from "@/lib/portal/data"
import { formatCurrency } from "@/lib/utils"

export default function AppPaymentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<PortalPayment[]>([])

  const load = useCallback(async () => {
    const session = await getPortalSession()
    if (!session) { router.replace("/login"); return }
    const data = await getPortalPayments()
    setPayments(data)
    setLoading(false)
  }, [router])

  useEffect(() => { void load() }, [load])

  if (loading) return <p className="text-(--muted)">Loading payment history...</p>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Client App</p>
        <h1 className="mt-4 font-display text-[clamp(2rem,4vw,3.6rem)] leading-none tracking-[-0.04em]">
          Payment history
        </h1>
        <p className="mt-3 text-(--muted)">All confirmed payments on your account.</p>
      </div>

      <div className="mt-8">
        {payments.length === 0 ? (
          <div className="saintce-inset rounded-3xl p-8 text-center">
            <p className="text-(--muted)">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="saintce-inset rounded-[22px] p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-display text-xl">{formatCurrency(payment.amount)}</p>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                        Paid
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-(--muted)">
                      {payment.invoice_number && <span className="mr-2">{payment.invoice_number} ·</span>}
                      {payment.service_name && <span>{payment.service_name}</span>}
                      {payment.project_name && <span className="ml-1 text-(--muted)">({payment.project_name})</span>}
                    </p>
                    {payment.payment_reference && (
                      <p className="mt-1 font-mono text-xs text-(--muted)">Ref: {payment.payment_reference}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm text-(--muted-strong)">
                      {payment.paid_at
                        ? new Date(payment.paid_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                        : "—"}
                    </p>
                    {payment.payment_method && (
                      <p className="mt-0.5 text-xs capitalize text-(--muted)">{payment.payment_method}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
