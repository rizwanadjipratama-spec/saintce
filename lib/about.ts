import { supabase } from "@/lib/supabase"

export interface AboutSection {
  id: string
  title: string
  subtitle: string
  paragraph1: string
  paragraph2: string
  paragraph3: string
  created_at: string
}

const EMPTY_ABOUT = {
  title: "",
  subtitle: "",
  paragraph1: "",
  paragraph2: "",
  paragraph3: "",
}

export async function fetchAboutSection() {
  const { data, error } = await supabase
    .from("about_section")
    .select("id, title, subtitle, paragraph1, paragraph2, paragraph3, created_at")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as AboutSection | null
}

export async function ensureAboutSection() {
  const existing = await fetchAboutSection()

  if (existing) {
    return existing
  }

  const { data, error } = await supabase
    .from("about_section")
    .insert(EMPTY_ABOUT)
    .select("id, title, subtitle, paragraph1, paragraph2, paragraph3, created_at")
    .single()

  if (error) {
    throw error
  }

  return data as AboutSection
}

export async function updateAboutSection(payload: Omit<AboutSection, "created_at">) {
  const { data, error } = await supabase
    .from("about_section")
    .update({
      title: payload.title.trim(),
      subtitle: payload.subtitle.trim(),
      paragraph1: payload.paragraph1.trim(),
      paragraph2: payload.paragraph2.trim(),
      paragraph3: payload.paragraph3.trim(),
    })
    .eq("id", payload.id)
    .select("id, title, subtitle, paragraph1, paragraph2, paragraph3, created_at")
    .single()

  if (error) {
    throw error
  }

  return data as AboutSection
}
