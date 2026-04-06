"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"

interface PermissionRow {
  id: string
  email: string
  created_at: string
}

export default function ProjectPermissionsPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [isStrict, setIsStrict] = useState(false)
  const [permissions, setPermissions] = useState<PermissionRow[]>([])
  const [newEmail, setNewEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [projRes, permRes] = await Promise.all([
        supabase.from("projects").select("name, is_strict_access").eq("id", projectId).maybeSingle(),
        supabase.from("project_permissions").select("id, email, created_at").eq("project_id", projectId).order("created_at"),
      ])
      if (projRes.error) throw projRes.error
      const proj = projRes.data as Record<string, unknown> | null
      setProjectName(String(proj?.name ?? "Project"))
      setIsStrict(Boolean(proj?.is_strict_access ?? false))
      setPermissions((permRes.data ?? []) as PermissionRow[])
      setMessage(null)
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to load permissions."))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId) { router.replace("/admin/projects"); return }
    let active = true
    const init = async () => {
      const allowed = await hasAdminAccess()
      if (!allowed) { router.replace("/login"); return }
      if (active) await load()
    }
    void init()
    return () => { active = false }
  }, [load, router, projectId])

  const handleToggleStrict = useCallback(async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from("projects").update({ is_strict_access: !isStrict }).eq("id", projectId)
      if (error) throw error
      setIsStrict((p) => !p)
      setMessage(`Strict access ${!isStrict ? "enabled" : "disabled"}.`)
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to update."))
    } finally {
      setSaving(false)
    }
  }, [isStrict, projectId])

  const handleAddEmail = useCallback(async () => {
    const email = newEmail.trim().toLowerCase()
    if (!email.includes("@")) { setMessage("Enter a valid email."); return }
    setSaving(true)
    try {
      const { error } = await supabase.from("project_permissions").insert({ project_id: projectId, email })
      if (error) throw error
      setNewEmail("")
      await load()
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to add permission."))
    } finally {
      setSaving(false)
    }
  }, [newEmail, projectId, load])

  const handleRemove = useCallback(async (id: string) => {
    try {
      const { error } = await supabase.from("project_permissions").delete().eq("id", id)
      if (error) throw error
      await load()
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to remove permission."))
    }
  }, [load])

  if (loading) return <div className="text-(--muted)">Loading permissions...</div>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <Link href="/admin/projects" className="text-xs text-(--muted) hover:text-(--text-primary) transition">
          ← Projects
        </Link>
        <p className="mt-4 font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Access control</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,4vw,4rem)] leading-none tracking-[-0.04em]">
          {projectName}
        </h1>
        <p className="mt-3 text-(--muted)">Control which emails can access this project in the client portal.</p>
      </div>

      {message && <p className="mt-4 text-(--muted-strong)">{message}</p>}

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        {/* Strict mode toggle */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="font-display text-xl">Access mode</h2>
          <p className="mt-3 text-sm text-(--muted)">
            {isStrict
              ? "Strict mode: only emails in the permission list can access this project."
              : "Open mode: any client whose email matches the client record can access this project."}
          </p>
          <div className="mt-6">
            <button
              onClick={handleToggleStrict}
              disabled={saving}
              className={`saintce-button ${isStrict ? "" : "saintce-button--ghost"}`}
            >
              {isStrict ? "Disable strict access" : "Enable strict access"}
            </button>
          </div>
          {isStrict && (
            <p className="mt-4 text-xs text-(--signal)">
              Strict access is ON — only emails listed below can see this project in the portal.
            </p>
          )}
        </section>

        {/* Permission list */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="mb-5 font-display text-xl">Allowed emails</h2>

          <div className="flex gap-3">
            <input
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="client@email.com"
              className="saintce-input flex-1"
              onKeyDown={(e) => { if (e.key === "Enter") void handleAddEmail() }}
            />
            <button onClick={handleAddEmail} disabled={saving} className="saintce-button shrink-0">
              Add
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {permissions.length === 0 ? (
              <p className="text-sm text-(--muted)">
                {isStrict ? "No emails added — no one can access this project in strict mode." : "No explicit permissions. All client emails can access."}
              </p>
            ) : permissions.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 rounded-[16px] border border-(--border-soft) px-4 py-3">
                <p className="text-sm text-(--text-primary)">{p.email}</p>
                <button onClick={() => handleRemove(p.id)} className="saintce-button saintce-button--ghost text-xs">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
