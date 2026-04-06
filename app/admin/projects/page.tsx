"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { fetchClients } from "@/lib/clients"
import { getProjects, saveProjectRecord, changeProjectStatus } from "@/lib/projects/service"
import type { ProjectRecord, ProjectStatus, ProjectType } from "@/lib/projects/types"
import type { Client } from "@/lib/clients"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"

const INITIAL_FORM = {
  client_id: "",
  name: "",
  type: "website" as ProjectType,
  domain: "",
  status: "active" as ProjectStatus,
}

export default function AdminProjectsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [form, setForm] = useState(INITIAL_FORM)

  const loadData = useCallback(async () => {
    try {
      const [clientRows, projectRows] = await Promise.all([
        fetchClients({ includeArchived: true }),
        getProjects({ page: 1, pageSize: 50 }),
      ])
      setClients(clientRows)
      setProjects(projectRows.data)
      setMessage(null)
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to load projects."))
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
      await saveProjectRecord(form)
      setForm(INITIAL_FORM)
      setMessage("Project created.")
      await loadData()
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to save project."))
    } finally {
      setSaving(false)
    }
  }, [form, loadData])

  const handleStatus = useCallback(async (projectId: string, status: ProjectStatus) => {
    try {
      await changeProjectStatus(projectId, status)
      setMessage(`Project ${status}.`)
      await loadData()
    } catch (error) {
      setMessage(getErrorMessage(error, "Unable to update project status."))
    }
  }, [loadData])

  if (loading) {
    return <div className="text-(--muted)">Loading projects...</div>
  }

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Projects</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">Project system</h1>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="saintce-inset rounded-[28px] p-6">
          <div className="grid gap-4">
            <select value={form.client_id} onChange={(e) => setForm((prev) => ({ ...prev, client_id: e.target.value }))} className="saintce-input">
              <option value="">Select client</option>
              {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
            </select>
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="saintce-input" placeholder="Project name" />
            <div className="grid gap-4 md:grid-cols-2">
              <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as ProjectType }))} className="saintce-input">
                <option value="website">Website</option>
                <option value="erp">ERP</option>
                <option value="system">System</option>
              </select>
              <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as ProjectStatus }))} className="saintce-input">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <input value={form.domain} onChange={(e) => setForm((prev) => ({ ...prev, domain: e.target.value }))} className="saintce-input" placeholder="Domain" />
            {message && <p className="text-(--muted-strong)">{message}</p>}
            <button onClick={handleSubmit} disabled={saving} className="saintce-button">{saving ? "Saving..." : "Create project"}</button>
          </div>
        </section>

        <section className="saintce-inset rounded-[28px] p-6">
          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.id} className="rounded-[22px] border border-(--border-soft) px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-lg text-(--text-primary)">{project.name}</p>
                    <p className="mt-1 text-sm text-(--muted)">{project.client?.name || "Unknown client"} · {project.type} · {project.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button onClick={() => handleStatus(project.id, "active")} className="saintce-button saintce-button--ghost">Activate</button>
                    <button onClick={() => handleStatus(project.id, "suspended")} className="saintce-button saintce-button--ghost">Suspend</button>
                    <Link href={`/admin/projects/${project.id}/permissions`} className="saintce-button saintce-button--ghost">Permissions</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
