import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// -------------------------------------------------------
// Rate limiter
// In-memory, per-edge-instance. Sufficient for abuse prevention on single-region Vercel.
// -------------------------------------------------------
const RATE_STORE = new Map<string, { count: number; resetAt: number }>()

const RATE_LIMITS: Array<{ pattern: RegExp; max: number; windowMs: number }> = [
  { pattern: /^\/api\/contact/, max: 5, windowMs: 60_000 },
  { pattern: /^\/api\/portal\/checkout/, max: 10, windowMs: 60_000 },
  { pattern: /^\/api\/admin\/export/, max: 20, windowMs: 60_000 },
]

let lastCleanup = 0
function cleanupRateStore() {
  const now = Date.now()
  if (now - lastCleanup < 30_000) return
  lastCleanup = now
  for (const [key, entry] of RATE_STORE) {
    if (now > entry.resetAt) RATE_STORE.delete(key)
  }
}

function checkRateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = RATE_STORE.get(key)
  if (!entry || now > entry.resetAt) {
    RATE_STORE.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= max) return false
  entry.count += 1
  return true
}

// -------------------------------------------------------
// Proxy / middleware
// -------------------------------------------------------
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  cleanupRateStore()

  // Legacy /ajx-core guard
  if (pathname.startsWith("/ajx-core")) {
    const headerKey = request.headers.get("x-admin-key")
    const secret = process.env.ADMIN_SECRET
    if (headerKey !== secret) {
      return new NextResponse("Not Found", { status: 404 })
    }
    return NextResponse.next()
  }

  // Rate limiting on sensitive API routes
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"

  for (const rule of RATE_LIMITS) {
    if (rule.pattern.test(pathname)) {
      const key = `${ip}:${pathname.split("?")[0]}`
      if (!checkRateLimit(key, rule.max, rule.windowMs)) {
        return new NextResponse(
          JSON.stringify({ error: "Too many requests. Please try again later." }),
          { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
        )
      }
      break
    }
  }

  // App auth guard — redirect unauthenticated requests to /login before page HTML is served
  const isAppPath = pathname.startsWith("/app")
  const isPortalPath = pathname.startsWith("/portal") && !pathname.startsWith("/portal/login")

  if (isAppPath || isPortalPath) {
    const hasSession =
      request.cookies.has("sb-access-token") ||
      request.cookies.getAll().some(
        ({ name }) => name.startsWith("sb-") && name.endsWith("-auth-token")
      )
    if (!hasSession) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/ajx-core/:path*",
    "/app/:path*",
    "/portal/:path*",
    "/api/contact",
    "/api/portal/:path*",
    "/api/admin/export",
  ],
}
