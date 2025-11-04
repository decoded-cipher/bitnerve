import { defineEventHandler, setHeader } from "h3"

export default defineEventHandler((event) => {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  }

  // Set security and caching headers
  Object.entries(headers).forEach(([key, value]) => {
    setHeader(event, key, value)
  })

  // Cache optimization for static assets
  if (event.node.req.url?.includes("/assets/") || event.node.req.url?.includes("/_nuxt/")) {
    setHeader(event, "Cache-Control", "public, max-age=31536000, immutable")
  } else if (!event.node.req.url?.includes("/api/")) {
    setHeader(event, "Cache-Control", "public, max-age=3600, s-maxage=3600")
  }
})
