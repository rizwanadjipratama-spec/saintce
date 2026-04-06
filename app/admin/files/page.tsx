"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { hasAdminAccess } from "@/lib/admin-auth"
import { getErrorMessage } from "@/lib/errors"
import { uploadClientFile, getClientFiles, getSignedUrl, deleteClientFile, formatFileSize, validateFileType } from "@/lib/files/service"
import type { ClientFile, FileCategory } from "@/lib/files/types"

interface ClientOption { id: string; name: string }

const CATEGORIES: FileCategory[] = ["document", "contract", "invoice", "image", "other"]

export default function AdminFilesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [selectedClientId, setSelectedClientId] = useState("")
  const [files, setFiles] = useState<ClientFile[]>([])
  const [category, setCategory] = useState<FileCategory>("document")
  const [description, setDescription] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const loadClients = useCallback(async () => {
    const { data } = await supabase.from("clients").select("id, name").order("name").limit(200)
    setClients((data ?? []) as ClientOption[])
  }, [])

  const loadFiles = useCallback(async (clientId: string) => {
    if (!clientId) { setFiles([]); return }
    try {
      const rows = await getClientFiles(clientId)
      setFiles(rows)
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to load files."))
    }
  }, [])

  useEffect(() => {
    let active = true
    const init = async () => {
      const allowed = await hasAdminAccess()
      if (!allowed) { router.replace("/login"); return }
      if (active) { await loadClients(); setLoading(false) }
    }
    void init()
    return () => { active = false }
  }, [loadClients, router])

  useEffect(() => {
    void loadFiles(selectedClientId)
  }, [selectedClientId, loadFiles])

  const handleUpload = useCallback(async () => {
    const file = fileRef.current?.files?.[0]
    if (!selectedClientId) { setMessage("Select a client first."); return }
    if (!file) { setMessage("Select a file to upload."); return }

    const typeErr = validateFileType(file)
    if (typeErr) { setMessage(typeErr); return }

    setUploading(true)
    try {
      await uploadClientFile({ clientId: selectedClientId, file, category, description: description || undefined, uploadedByType: "admin" })
      setMessage("File uploaded.")
      setDescription("")
      if (fileRef.current) fileRef.current.value = ""
      await loadFiles(selectedClientId)
    } catch (err) {
      setMessage(getErrorMessage(err, "Upload failed."))
    } finally {
      setUploading(false)
    }
  }, [selectedClientId, category, description, loadFiles])

  const handleDownload = useCallback(async (f: ClientFile) => {
    try {
      const url = await getSignedUrl(f.storage_path)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to generate download link."))
    }
  }, [])

  const handleDelete = useCallback(async (f: ClientFile) => {
    if (!confirm(`Delete "${f.original_name}"?`)) return
    try {
      await deleteClientFile(f.id, f.storage_path)
      await loadFiles(selectedClientId)
      setMessage("File deleted.")
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to delete file."))
    }
  }, [selectedClientId, loadFiles])

  if (loading) return <div className="text-(--muted)">Loading...</div>

  return (
    <div>
      <div className="border-b border-(--border-soft) pb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Files</p>
        <h1 className="mt-4 font-display text-[clamp(2.4rem,4.5vw,4.6rem)] leading-none tracking-[-0.04em]">
          File manager
        </h1>
        <p className="mt-3 text-(--muted)">Upload and manage files per client. Stored in Supabase Storage.</p>
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        {/* Upload panel */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="mb-5 font-display text-xl">Upload file</h2>
          <div className="grid gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Client</label>
              <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="saintce-input">
                <option value="">Select client</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as FileCategory)} className="saintce-input">
                {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Description (optional)</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Signed contract Q1 2026" className="saintce-input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">File (max 50MB)</label>
              <input ref={fileRef} type="file" className="saintce-input" />
            </div>
            {message && <p className="text-(--muted-strong)">{message}</p>}
            <button onClick={handleUpload} disabled={uploading} className="saintce-button">
              {uploading ? "Uploading..." : "Upload file"}
            </button>
          </div>
        </section>

        {/* File list */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="mb-5 font-display text-xl">
            {selectedClientId ? `Files (${files.length})` : "Select a client"}
          </h2>
          {!selectedClientId ? (
            <p className="text-(--muted)">Select a client to view their files.</p>
          ) : files.length === 0 ? (
            <p className="text-(--muted)">No files uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {files.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-4 rounded-[20px] border border-(--border-soft) px-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-(--text-primary)">{f.original_name}</p>
                    <p className="mt-1 text-xs text-(--muted)">
                      {f.category} · {f.size_bytes ? formatFileSize(f.size_bytes) : "unknown size"} · {new Date(f.created_at).toLocaleDateString()}
                    </p>
                    {f.description && <p className="mt-0.5 text-xs text-(--muted)">{f.description}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => handleDownload(f)} className="saintce-button saintce-button--ghost text-sm">Download</button>
                    <button onClick={() => handleDelete(f)} className="saintce-button saintce-button--ghost text-sm">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
