import { memo, type ReactNode } from "react"

export interface Client {
  id: string
  name: string
  category: string
  description: string
  link: string
  status: "live" | "beta" | "private" | "archived"
}

interface Props {
  client: Client
}

const STATUS_STYLES: Record<Client["status"], string> = {
  live: "bg-emerald-500/12 text-emerald-200 border-emerald-400/25",
  beta: "bg-amber-500/12 text-amber-100 border-amber-400/25",
  private: "bg-rose-500/12 text-rose-100 border-rose-400/20",
  archived: "bg-white/8 text-white/70 border-white/12",
}

function Wrapper({ isPrivate, href, children }: { isPrivate: boolean; href: string; children: ReactNode }) {
  if (isPrivate) {
    return <div className="block cursor-not-allowed opacity-85">{children}</div>
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      {children}
    </a>
  )
}

function ClientCardComponent({ client }: Props) {
  const safeStatus = client.status || "live"
  const isPrivate = safeStatus === "private"

  return (
    <Wrapper isPrivate={isPrivate} href={client.link}>
      <article className="orion-panel orion-panel--inset flex h-full flex-col justify-between p-6 transition-transform duration-300 hover:-translate-y-1">
        <div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              {client.category || "Uncategorized"}
            </p>
            <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${STATUS_STYLES[safeStatus]}`}>
              {safeStatus}
            </span>
          </div>

          <h3 className="mt-8 font-display text-3xl leading-none text-[var(--text-primary)]">{client.name}</h3>
          <p className="mt-5 text-[0.98rem] leading-[1.8] text-[var(--muted)]">{client.description}</p>
        </div>

        <div className="mt-10 text-sm text-[var(--muted-strong)]">
          {isPrivate ? "Private project" : "Open project"}
        </div>
      </article>
    </Wrapper>
  )
}

const ClientCard = memo(ClientCardComponent)

export default ClientCard
