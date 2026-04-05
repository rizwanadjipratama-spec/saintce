"use client"

import { supabase } from "@/lib/supabase"
import { getBaseUrl, siteConfig } from "@/lib/site-config"

export default function LoginPage() {
  const loginWithGithub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${getBaseUrl()}/admin`,
      },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="saintce-panel w-full max-w-[460px] p-8 text-center md:p-10">
        <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-[var(--signal)]">Secure access</p>
        <h1 className="mt-4 font-display text-4xl text-[var(--text-primary)]">{siteConfig.brand.adminName}</h1>
        <p className="mt-4 text-[var(--muted)]">Authenticate with GitHub to enter the Saintce admin shell.</p>

        <button onClick={loginWithGithub} className="saintce-button mt-8 w-full">
          Login with GitHub
        </button>
      </div>
    </div>
  )
}
