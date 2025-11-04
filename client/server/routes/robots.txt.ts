import { defineEventHandler, setHeader } from "h3"

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const siteUrl = config.public.site.url

  if (!siteUrl) {
    throw createError({
      statusCode: 500,
      message: "NUXT_PUBLIC_SITE_URL is not configured",
    })
  }

  const robots = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /_nuxt/
Disallow: /assets/

# Sitemap
Sitemap: ${siteUrl}/sitemap.xml

# Crawl delay
Crawl-delay: 1

# Request rate (requests per second)
Request-rate: 1/1s`

  setHeader(event, "Content-Type", "text/plain; charset=utf-8")
  return robots
})
