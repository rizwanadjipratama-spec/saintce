import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,

  async redirects() {
    return [
      { source: "/portal", destination: "/app", permanent: true },
      { source: "/portal/login", destination: "/login", permanent: true },
      { source: "/portal/projects", destination: "/app/projects", permanent: true },
      { source: "/portal/subscriptions", destination: "/app/subscriptions", permanent: true },
      { source: "/portal/invoices", destination: "/app/invoices", permanent: true },
      { source: "/portal/invoices/:id", destination: "/app/invoices/:id", permanent: true },
      { source: "/portal/payments", destination: "/app/payments", permanent: true },
      { source: "/portal/files", destination: "/app/files", permanent: true },
      { source: "/portal/tickets", destination: "/app/tickets", permanent: true },
    ]
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // long-lived cache for static assets (fonts, images, icons)
        source: "/(.*)\\.(woff2|woff|ttf|otf|ico|png|svg|jpg|jpeg|webp|avif)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ]
  },
}

export default nextConfig
