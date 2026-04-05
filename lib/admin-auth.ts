import { supabase } from "@/lib/supabase"
import { siteConfig } from "@/lib/site-config"

/**
 * Shared admin access guard.
 */
export async function hasAdminAccess() {
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user) {
    return false
  }

  return data.user.email === siteConfig.contact.adminEmail
}
