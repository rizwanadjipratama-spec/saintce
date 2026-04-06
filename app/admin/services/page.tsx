"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getProjects } from "@/lib/projects/service"
import { getServices, saveServiceRecord, updateServiceActivation } from "@/lib/services/service"
import type { ProjectRecord } from "@/lib/projects/types"
import type { BillingInterval, ServiceRecord } from "@/lib/services/types"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"
import { formatCurrency } from "@/lib/utils"

const INITIAL_FORM = {
  project_id: "",
  name: "",
  description: "",
  price: 0,
  billing_interval: "monthly" as BillingInterval,
  is_recurring: true,
  is_active: true,
}

export default function AdminServicesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [services, setServices] = useState<ServiceRecord[]>([])
  const [form, setForm] = useState(INITIAL_FORM)

  const loadData = useCallback(async () => {
    try {
      const [projectRows, serviceRows] = await Promise.all([
        getProjects({ page: 1, pageSize: 100 }),
        getServices({ page: 1, pageSize: 100 }),
      ])
      setProjects(projectRows.data)
      setServices(serviceRows.data)
      setMessage(null)
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load services."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true

    const init = async () => {
      const allowed = await hasAdminAccess()
      if (!allowed) {
        router.replace("/login")
        return
      }

      if (active) {
        await loadData()
      }
    }

    void init()

    return () => {
      active = false
    }
  }, [loadData, router])

  const handleSubmit = useCallback(async () => {
    setSaving(true)
    try {
      await saveServiceRecord(form)
      setForm(INITIAL_FORM)
      setMessage("Service created.")
      await loadData()
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save service."))
    } finally {
      setSaving(false)
    }
  }, [form, loadData])

  const handleActivation = useCallback(async (serviceId: string, nextValue: boolean) => {
    try {
      await updateServiceActivation(serviceId, nextValue)
      setMessage(nextValue ? "Service activated." : "Service suspended.")
      await loadData()
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to update service state."))
    }
  }, [loadData])

  if (loading) {
    return <div className="text-(--muted)">Loading services...</div>
  }

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Services</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">Recurring service catalog</h1>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="saintce-inset rounded-[28px] p-6">
          <div className="grid gap-4">
            <select value={form.project_id} onChange={(e) => setForm((prev) => ({ ...prev, project_id: e.target.value }))} className="saintce-input">
              <option value="">Select project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="saintce-input" placeholder="Service name" />
            <textarea value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="saintce-input min-h-[140px]" placeholder="Description" />
            <div className="grid gap-4 md:grid-cols-2">
              <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: Number(e.target.value || 0) }))} className="saintce-input" placeholder="Price" />
              <select value={form.billing_interval} onChange={(e) => setForm((prev) => ({ ...prev, billing_interval: e.target.value as BillingInterval }))} className="saintce-input">
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
                <option value="one_time">One time</option>
              </select>
            </div>
            <label className="flex items-center gap-3 text-sm text-(--muted)">
              <input type="checkbox" checked={form.is_recurring} onChange={(e) => setForm((prev) => ({ ...prev, is_recurring: e.target.checked }))} />
              Recurring service
            </label>
            {message && <p className="text-(--muted-strong)">{message}</p>}
            <button onClick={handleSubmit} disabled={saving} className="saintce-button">{saving ? "Saving..." : "Create service"}</button>
          </div>
        </section>

        <section className="saintce-inset rounded-[28px] p-6">
          <div className="space-y-3">
            {services.map((service) => (
              <div key={service.id} className="rounded-[22px] border border-(--border-soft) px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg text-(--text-primary)">{service.name}</p>
                    <p className="mt-1 text-sm text-(--muted)">{service.project?.name || "Unknown project"} · {formatCurrency(service.price)} · {service.billing_interval}</p>
                  </div>
                  <button onClick={() => handleActivation(service.id, !service.is_active)} className="saintce-button saintce-button--ghost">
                    {service.is_active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
