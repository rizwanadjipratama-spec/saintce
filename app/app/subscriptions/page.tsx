"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getPortalSession } from "@/lib/portal/auth"
import { getPortalProjects, type PortalService } from "@/lib/portal/data"
import { formatCurrency } from "@/lib/utils"

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/12 text-emerald-200 border-emerald-400/25",
  past_due: "bg-amber-500/12 text-amber-100 border-amber-400/25",
  suspended: "bg-rose-500/12 text-rose-100 border-rose-400/20",
  cancelled: "bg-white/8 text-white/70 border-white/12",
}

interface FlatSubscription {
  serviceId: string
  serviceName: string
  projectName: string
  price: number
  billingInterval: string
  service: PortalService
}

export default function AppSubscriptionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<FlatSubscription[]>([])

  const load = useCallback(async () => {
    const session = await getPortalSession()
    if (!session) { router.replace("/login"); return }

    const projects = await getPortalProjects(session.clientId)
    const flat: FlatSubscription[] = []

    for (const project of projects) {
      for (const svc of project.services) {
        if (svc.subscription) {
          flat.push({
            serviceId: svc.id,
            serviceName: svc.name,
            projectName: project.name,
            price: svc.price,
            billingInterval: svc.billing_interval,
            service: svc,
          })
        }
      }
    }

    setSubscriptions(flat)
    setLoading(false)
  }, [router])

  useEffect(() => { void load() }, [load])

  if (loading) return <p className="text-(--muted)">Loading subscriptions...</p>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Client App</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4rem)] leading-none tracking-[-0.04em]">
          Subscriptions
        </h1>
        <p className="mt-3 text-(--muted)">{subscriptions.length} subscription{subscriptions.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="mt-8 space-y-4">
        {subscriptions.length > 0 ? (
          subscriptions.map((sub) => {
            const subscription = sub.service.subscription!
            return (
              <div key={sub.serviceId} className="saintce-panel saintce-panel--inset p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-(--muted)">{sub.projectName}</p>
                    <h2 className="mt-2 font-display text-2xl text-(--text-primary)">{sub.serviceName}</h2>
                    <p className="mt-1 text-[0.95rem] text-(--muted)">
                      {formatCurrency(sub.price)} / {sub.billingInterval}
                    </p>
                  </div>
                  <span className={`self-start rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${STATUS_STYLES[subscription.status] ?? STATUS_STYLES.cancelled}`}>
                    {subscription.status.replace("_", " ")}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 border-t border-(--border-soft) pt-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.14em] text-(--muted)">Billing cycle</p>
                    <p className="mt-1 text-(--text-primary) capitalize">{subscription.billing_interval}</p>
                  </div>
                  {subscription.current_period_end && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-(--muted)">Current period ends</p>
                      <p className="mt-1 text-(--text-primary)">{subscription.current_period_end.slice(0, 10)}</p>
                    </div>
                  )}
                  {subscription.next_billing_date && (
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-(--muted)">Next billing date</p>
                      <p className="mt-1 text-(--text-primary)">{subscription.next_billing_date.slice(0, 10)}</p>
                    </div>
                  )}
                </div>

                {subscription.status === "suspended" && (
                  <div className="mt-4 rounded-[18px] border border-rose-400/20 bg-rose-500/8 px-4 py-3">
                    <p className="text-sm text-rose-200">
                      This subscription is suspended due to an overdue invoice. Pay your outstanding invoice to reactivate access.
                    </p>
                  </div>
                )}
                {subscription.status === "past_due" && (
                  <div className="mt-4 rounded-[18px] border border-amber-400/20 bg-amber-500/8 px-4 py-3">
                    <p className="text-sm text-amber-100">
                      Payment is past due. Please pay your outstanding invoice to avoid service suspension.
                    </p>
                  </div>
                )}
              </div>
            )
          })
        ) : (
          <p className="text-(--muted)">No subscriptions found.</p>
        )}
      </div>
    </div>
  )
}
