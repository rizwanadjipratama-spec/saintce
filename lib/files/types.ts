export type FileCategory = "document" | "contract" | "invoice" | "image" | "other"

export interface ClientFile {
  id: string
  client_id: string
  project_id: string | null
  storage_path: string
  original_name: string
  mime_type: string | null
  size_bytes: number | null
  category: FileCategory
  description: string | null
  uploaded_by_type: "admin" | "client"
  created_at: string
}

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB
export const BUCKET = "client-files"
