"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { siteConfig } from "@/lib/site-config"

type Step = "email" | "sent" | "checking"

export default function LoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // After magic link redirect, detect session and route by role
  const resolveRole = useCallback(async () => {
    setStep("checking")
    setError(null)

    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user
    if (!user?.email) return

    // 1. Check admin
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("id")
      .or(`user_id.eq.${user.id},email.ilike.${user.email}`)
      .eq("is_active", true)
      .maybeSingle()

    if (adminRow || user.email === siteConfig.contact.adminEmail) {
      router.replace("/admin")
      return
    }

    // 2. Check client
    const { data: clientRow } = await supabase
      .from("clients")
      .select("id")
      .ilike("email", user.email)
      .maybeSingle()

    if (clientRow) {
      router.replace("/app")
      return
    }

    // 3. No account
    await supabase.auth.signOut()
    setStep("email")
    setError("No account found for this email address. Contact us to get access.")
  }, [router])

  // Detect if arriving back from a magic link (auth token in URL hash/params)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        void resolveRole()
      }
    })

    // Also check if already signed in on mount
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        void resolveRole()
      }
    }).catch(() => undefined)

    return () => { subscription.unsubscribe() }
  }, [resolveRole])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmed = email.trim().toLowerCase()
    if (!trimmed) { setError("Email is required."); return }

    setLoading(true)

    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${origin}/login`,
        shouldCreateUser: false,
      },
    })

    setLoading(false)

    if (otpError) {
      setError(otpError.message)
      return
    }

    setStep("sent")
  }, [email])

  if (step === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-(--muted)">Verifying access...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-105">
        <div className="saintce-panel p-8">
          <div className="mb-8">
            <p className="font-mono text-[0.75rem] uppercase tracking-[0.16em] text-(--signal)">
              Secure access
            </p>
            <h1 className="mt-4 font-display text-[2.4rem] leading-none tracking-[-0.04em]">
              {siteConfig.brand.name}
            </h1>
            <p className="mt-3 text-[0.95rem] leading-[1.7] text-(--muted)">
              Enter your registered email to receive a secure login link.
            </p>
          </div>

          {step === "sent" ? (
            <div className="saintce-inset rounded-[22px] p-5">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-(--signal)">
                Link sent
              </p>
              <p className="mt-3 text-[0.95rem] leading-[1.7] text-(--text-primary)">
                Check your inbox at <strong>{email}</strong>. Click the link to sign in.
              </p>
              <p className="mt-2 text-sm text-(--muted)">
                The link expires in 60 minutes. If you don&apos;t see it, check your spam folder.
              </p>
              <button
                onClick={() => { setStep("email"); setEmail("") }}
                className="saintce-button saintce-button--ghost mt-4 w-full text-sm"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-2 block font-mono text-[0.72rem] uppercase tracking-[0.16em] text-(--muted)"
                  >
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    required
                    disabled={loading}
                    className="saintce-input"
                  />
                </div>

                {error && (
                  <p className="text-sm text-(--signal)">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="saintce-button w-full"
                >
                  {loading ? "Sending..." : "Send login link"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-(--muted)">
          Only registered clients and team members can sign in. Contact{" "}
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="text-(--muted-strong) underline transition-colors hover:text-(--text-primary)"
          >
            {siteConfig.contact.email}
          </a>{" "}
          if you need access.
        </p>
      </div>
    </div>
  )
}
