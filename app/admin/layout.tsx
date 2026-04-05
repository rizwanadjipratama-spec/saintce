"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { ANIMATION } from "@/lib/animation"
import { siteConfig } from "@/lib/site-config"

const MENU = [
  { name: "Overview", href: "/admin" },
  { name: "Clients", href: "/admin/clients" },
  { name: "About", href: "/admin/about" },
]

const ACTIVE_NAV_TRANSITION = {
  type: "spring" as const,
  stiffness: ANIMATION.springStiffness,
  damping: ANIMATION.springDamping,
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)]">
      <div className="grid min-h-screen lg:grid-cols-[300px_1fr]">
        <aside className="border-r border-[var(--border-soft)] px-5 py-5">
          <div className="orion-panel flex h-full flex-col p-5">
            <div className="border-b border-[var(--border-soft)] pb-5">
              <p className="font-display text-xs tracking-[0.28em] text-[var(--text-primary)]">
                {siteConfig.brand.adminName}
              </p>
              <p className="mt-3 text-sm text-[var(--muted)]">{siteConfig.brand.tag}</p>
            </div>

            <nav className="mt-6 space-y-3">
              {MENU.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))

                return (
                  <Link key={item.href} href={item.href} className="relative block">
                    <div
                      className={`relative z-10 rounded-[18px] px-5 py-4 text-sm transition ${
                        isActive ? "text-[var(--text-primary)]" : "text-[var(--muted)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {item.name}
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="admin-active"
                        className="absolute inset-0 rounded-[18px] border border-[var(--border-soft)] bg-[var(--panel-subtle)]"
                        transition={ACTIVE_NAV_TRANSITION}
                      />
                    )}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-auto border-t border-[var(--border-soft)] pt-5 text-sm text-[var(--muted)]">
              Single shell. Cleaner queries. Orion edition.
            </div>
          </div>
        </aside>

        <main className="px-5 py-5">
          <div className="orion-panel min-h-full p-6 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
