export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const siteUrl = config.public.site.url

  useHead({
    meta: [
      { property: 'og:url', content: siteUrl },
      { property: 'og:image', content: `${siteUrl}/og-image.jpg` },
      { name: 'twitter:url', content: siteUrl },
      { name: 'twitter:image', content: `${siteUrl}/og-image.jpg` },
    ],
    link: [
      { rel: 'canonical', href: siteUrl },
    ],
  })
})

