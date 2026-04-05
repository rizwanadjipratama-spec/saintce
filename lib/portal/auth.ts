import { supabase } from "@/lib/supabase"

export interface PortalSession {
  userId: string
  email: string
  clientId: string
  clientName: string
}

/**
 * Fetch current portal session.
 * Returns null if not logged in or not a registered client.
 */
export async function getPortalSession(): Promise<PortalSession | null> {
  const { data: sessionData } = await supabase.auth.getSession()
  const user = sessionData.session?.user

  if (!user?.email) {
    return null
  }

  const { data: client, error } = await supabase
    .from("clients")
    .select("id, name")
    .ilike("email", user.email)
    .single()

  if (error || !client) {
    return null
  }

  return {
    userId: user.id,
    email: user.email,
    clientId: client.id,
    clientName: client.name,
  }
}

/**
 * Send magic link to email. Returns error message or null on success.
 */
export async function sendPortalMagicLink(
  email: string,
  redirectTo: string
): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: false, // only allow existing clients, not arbitrary signups
    },
  })

  if (error) {
    return error.message
  }

  return null
}

export async function signOutPortal(): Promise<void> {
  await supabase.auth.signOut()
}
