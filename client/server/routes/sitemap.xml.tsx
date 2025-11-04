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

  const pages = [
    {
      loc: "/",
      lastmod: new Date().toISOString(),
      changefreq: "hourly",
      priority: "1.0",
    },
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages
    .map(
      (page) => `
  <url>
    <loc>${siteUrl}${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
  `,
    )
    .join("")}
</urlset>`

  setHeader(event, "Content-Type", "application/xml")
  return sitemap
})
