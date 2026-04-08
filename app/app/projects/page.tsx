"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getPortalSession } from "@/lib/portal/auth"
import { getPortalProjects, type PortalProject } from "@/lib/portal/data"
import { formatCurrency } from "@/lib/utils"

const PROJECT_STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/12 text-emerald-200 border-emerald-400/25",
  suspended: "bg-rose-500/12 text-rose-100 border-rose-400/20",
  archived: "bg-white/8 text-white/70 border-white/12",
}

const SUB_STATUS_STYLES: Record<string, string> = {
  active: "text-emerald-200",
  past_due: "text-amber-200",
  suspended: "text-rose-300",
  cancelled: "text-(--muted)",
}

export default function AppProjectsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<PortalProject[]>([])

  const load = useCallback(async () => {
    const session = await getPortalSession()
    if (!session) { router.replace("/login"); return }
    const data = await getPortalProjects(session.clientId)
    setProjects(data)
    setLoading(false)
  }, [router])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [load])

  if (loading) return <p className="text-(--muted)">Loading projects...</p>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Client App</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4rem)] leading-none tracking-[-0.04em]">
          Your projects
        </h1>
        <p className="mt-3 text-(--muted)">{projects.length} project{projects.length !== 1 ? "s" : ""} found</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {projects.length > 0 ? (
          projects.map((project) => (
            <div key={project.id} className="saintce-panel saintce-panel--inset p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-(--muted)">
                    {project.type}
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-(--text-primary)">{project.name}</h2>
                  {project.domain && <p className="mt-1 text-sm text-(--muted)">{project.domain}</p>}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${PROJECT_STATUS_STYLES[project.status] ?? PROJECT_STATUS_STYLES.archived}`}
                >
                  {project.access_blocked ? "Blocked" : project.status}
                </span>
              </div>

              {project.services.length > 0 && (
                <div className="mt-6 space-y-3">
                  <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-(--muted)">Services</p>
                  {project.services.map((svc) => (
                    <div key={svc.id} className="saintce-inset flex items-center justify-between rounded-[20px] px-4 py-3">
                      <div>
                        <p className="text-[0.95rem] text-(--text-primary)">{svc.name}</p>
                        <p className="mt-0.5 text-xs text-(--muted)">
                          {formatCurrency(svc.price)} / {svc.billing_interval}
                        </p>
                      </div>
                      <div className="text-right">
                        {svc.subscription ? (
                          <p className={`text-xs font-medium uppercase tracking-[0.12em] ${SUB_STATUS_STYLES[svc.subscription.status] ?? "text-(--muted)"}`}>
                            {svc.subscription.status.replace("_", " ")}
                          </p>
                        ) : (
                          <p className="text-xs text-(--muted)">No subscription</p>
                        )}
                        {svc.subscription?.next_billing_date && (
                          <p className="mt-0.5 text-xs text-(--muted)">
                            Next: {svc.subscription.next_billing_date.slice(0, 10)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-2 text-(--muted)">No projects assigned yet.</div>
        )}
      </div>
    </div>
  )
}
