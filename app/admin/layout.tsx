"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { ANIMATION } from "@/lib/animation"
import { siteConfig } from "@/lib/site-config"

const MENU = [
  { name: "Overview", href: "/admin" },
  { name: "Billing", href: "/admin/billing-overview" },
  { name: "Revenue", href: "/admin/revenue" },
  { name: "Activity", href: "/admin/activity" },
  { name: "Email Logs", href: "/admin/email-logs" },
  { name: "System Logs", href: "/admin/system-logs" },
  { name: "Email Templates", href: "/admin/email-templates" },
  { name: "Adjustments", href: "/admin/adjustments" },
  { name: "Tickets", href: "/admin/tickets" },
  { name: "Files", href: "/admin/files" },
  { name: "Refunds", href: "/admin/refunds" },
  { name: "Credits", href: "/admin/credits" },
  { name: "Migrations", href: "/admin/migrations" },
  { name: "Deployment", href: "/admin/deployment" },
  { name: "Sections", href: "/admin/sections" },
  { name: "Clients", href: "/admin/clients" },
  { name: "Projects", href: "/admin/projects" },
  { name: "Services", href: "/admin/services" },
  { name: "Subscriptions", href: "/admin/subscriptions" },
  { name: "Invoices", href: "/admin/invoices" },
  { name: "Payments", href: "/admin/payments" },
]

const ACTIVE_NAV_TRANSITION = {
  type: "spring" as const,
  stiffness: ANIMATION.springStiffness,
  damping: ANIMATION.springDamping,
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-transparent text-(--text-primary)">
      <div className="grid min-h-screen lg:grid-cols-[300px_1fr]">
        <aside className="border-r border-(--border-soft) px-5 py-5">
          <div className="saintce-panel flex h-full flex-col p-5">
            <div className="border-b border-(--border-soft) pb-5">
              <p className="font-display text-xs tracking-[0.28em] text-(--text-primary)">
                {siteConfig.brand.adminName}
              </p>
              <p className="mt-3 text-sm text-(--muted)">{siteConfig.brand.tag}</p>
            </div>

            <nav className="mt-6 space-y-3">
              {MENU.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href))

                return (
                  <Link key={item.href} href={item.href} className="relative block">
                    <div
                      className={`relative z-10 rounded-[18px] px-5 py-4 text-sm transition ${
                        isActive ? "text-(--text-primary)" : "text-(--muted) hover:text-(--text-primary)"
                      }`}
                    >
                      {item.name}
                    </div>
                    {isActive && (
                      <motion.div
                        layoutId="admin-active"
                        className="absolute inset-0 rounded-[18px] border border-(--border-soft) bg-(--panel-subtle)"
                        transition={ACTIVE_NAV_TRANSITION}
                      />
                    )}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-auto border-t border-(--border-soft) pt-5 text-sm text-(--muted)">
              Subscription billing, project ops, and Saintce control in one shell.
            </div>
          </div>
        </aside>

        <main className="px-5 py-5">
          <div className="saintce-panel min-h-full p-6 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
