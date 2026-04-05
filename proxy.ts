import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/ajx-core")

  if (!isAdminRoute) return NextResponse.next()

  const headerKey = request.headers.get("x-admin-key")
  const secret = process.env.ADMIN_SECRET

  if (headerKey !== secret) {
    return new NextResponse("Not Found", { status: 404 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/ajx-core/:path*"],
}