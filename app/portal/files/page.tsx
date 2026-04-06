"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { getPortalSession } from "@/lib/portal/auth"
import { getErrorMessage } from "@/lib/errors"
import { uploadClientFile, getClientFiles, getSignedUrl, deleteClientFile, formatFileSize, validateFileType } from "@/lib/files/service"
import type { ClientFile, FileCategory } from "@/lib/files/types"

const CATEGORIES: FileCategory[] = ["document", "contract", "invoice", "image", "other"]

export default function PortalFilesPage() {
  const router = useRouter()
  const [clientId, setClientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [files, setFiles] = useState<ClientFile[]>([])
  const [category, setCategory] = useState<FileCategory>("document")
  const [description, setDescription] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const loadFiles = useCallback(async (cid: string) => {
    try {
      const rows = await getClientFiles(cid)
      setFiles(rows)
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to load files."))
    }
  }, [])

  useEffect(() => {
    let active = true
    const init = async () => {
      const s = await getPortalSession()
      if (!s) { router.replace("/portal/login"); return }
      if (active) {
        setClientId(s.clientId)
        await loadFiles(s.clientId)
        setLoading(false)
      }
    }
    void init()
    return () => { active = false }
  }, [loadFiles, router])

  const handleUpload = useCallback(async () => {
    const file = fileRef.current?.files?.[0]
    if (!clientId || !file) { setMessage("Select a file to upload."); return }

    const typeErr = validateFileType(file)
    if (typeErr) { setMessage(typeErr); return }

    setUploading(true)
    try {
      await uploadClientFile({ clientId, file, category, description: description || undefined, uploadedByType: "client" })
      setMessage("File uploaded successfully.")
      setDescription("")
      if (fileRef.current) fileRef.current.value = ""
      await loadFiles(clientId)
    } catch (err) {
      setMessage(getErrorMessage(err, "Upload failed."))
    } finally {
      setUploading(false)
    }
  }, [clientId, category, description, loadFiles])

  const handleDownload = useCallback(async (f: ClientFile) => {
    try {
      const url = await getSignedUrl(f.storage_path)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to generate download link."))
    }
  }, [])

  const handleDelete = useCallback(async (f: ClientFile) => {
    if (f.uploaded_by_type !== "client") { setMessage("Admin-uploaded files cannot be deleted from portal."); return }
    if (!confirm(`Delete "${f.original_name}"?`)) return
    try {
      await deleteClientFile(f.id, f.storage_path)
      if (clientId) await loadFiles(clientId)
      setMessage("File deleted.")
    } catch (err) {
      setMessage(getErrorMessage(err, "Unable to delete file."))
    }
  }, [clientId, loadFiles])

  if (loading) return <div className="text-(--muted)">Loading files...</div>

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">Files</p>
        <h1 className="mt-2 font-display text-[clamp(2rem,4vw,3.6rem)] leading-none tracking-[-0.04em]">
          Your files
        </h1>
        <p className="mt-3 text-(--muted)">Upload documents, contracts, and other files shared with our team.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        {/* Upload */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="mb-5 font-display text-xl">Upload file</h2>
          <div className="grid gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as FileCategory)} className="saintce-input">
                {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">Description (optional)</label>
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Brand guidelines v2" className="saintce-input" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-(--muted)">File (max 50MB)</label>
              <input ref={fileRef} type="file" className="saintce-input" />
            </div>
            {message && <p className="text-(--muted-strong)">{message}</p>}
            <button onClick={handleUpload} disabled={uploading} className="saintce-button">
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </section>

        {/* File list */}
        <section className="saintce-inset rounded-[28px] p-6">
          <h2 className="mb-5 font-display text-xl">All files ({files.length})</h2>
          {files.length === 0 ? (
            <p className="text-(--muted)">No files yet. Upload your first file to share it with our team.</p>
          ) : (
            <div className="space-y-3">
              {files.map((f) => (
                <div key={f.id} className="flex items-center justify-between gap-4 rounded-[20px] border border-(--border-soft) px-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-(--text-primary)">{f.original_name}</p>
                    <p className="mt-1 text-xs text-(--muted)">
                      {f.category} · {f.size_bytes ? formatFileSize(f.size_bytes) : "—"} · {new Date(f.created_at).toLocaleDateString()}
                      {f.uploaded_by_type === "admin" && <span className="ml-2 text-(--signal)">admin</span>}
                    </p>
                    {f.description && <p className="mt-0.5 text-xs text-(--muted)">{f.description}</p>}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => handleDownload(f)} className="saintce-button saintce-button--ghost text-sm">Download</button>
                    {f.uploaded_by_type === "client" && (
                      <button onClick={() => handleDelete(f)} className="saintce-button saintce-button--ghost text-sm">Delete</button>
                    )}
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
