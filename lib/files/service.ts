import { supabase } from "@/lib/supabase"
import { BUCKET, MAX_FILE_SIZE_BYTES, type ClientFile, type FileCategory } from "@/lib/files/types"

export async function uploadClientFile(args: {
  clientId: string
  projectId?: string | null
  file: File
  category: FileCategory
  description?: string
  uploadedByType: "admin" | "client"
}): Promise<ClientFile> {
  if (args.file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File too large. Maximum size is 50MB.`)
  }

  const safeName = args.file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const storagePath = `clients/${args.clientId}/${Date.now()}_${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, args.file, { contentType: args.file.type, upsert: false })

  if (uploadError) throw uploadError

  const { data, error: insertError } = await supabase
    .from("client_files")
    .insert({
      client_id: args.clientId,
      project_id: args.projectId ?? null,
      storage_path: storagePath,
      original_name: args.file.name,
      mime_type: args.file.type || null,
      size_bytes: args.file.size,
      category: args.category,
      description: args.description ?? null,
      uploaded_by_type: args.uploadedByType,
    })
    .select("*")
    .single()

  if (insertError) {
    // Clean up storage on insert failure
    void supabase.storage.from(BUCKET).remove([storagePath])
    throw insertError
  }

  return data as ClientFile
}

export async function getClientFiles(clientId: string): Promise<ClientFile[]> {
  const { data, error } = await supabase
    .from("client_files")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []) as ClientFile[]
}

export async function getSignedUrl(storagePath: string, expiresIn = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresIn)

  if (error) throw error
  return data.signedUrl
}

export async function deleteClientFile(fileId: string, storagePath: string): Promise<void> {
  const { error: dbError } = await supabase.from("client_files").delete().eq("id", fileId)
  if (dbError) throw dbError
  // Best-effort storage removal
  void supabase.storage.from(BUCKET).remove([storagePath])
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Validation helpers
export function validateFileType(file: File): string | null {
  const blocked = [".exe", ".bat", ".cmd", ".sh", ".ps1", ".msi", ".dll"]
  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase()
  if (blocked.includes(ext)) return `File type ${ext} is not allowed.`
  return null
}
