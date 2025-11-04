export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const siteUrl = config.public.site.url

  if (!siteUrl) {
    console.warn('NUXT_PUBLIC_SITE_URL is not set')
    return
  }

  useHead({
    meta: [
      { property: 'og:url', content: siteUrl },
      { property: 'og:image', content: `${siteUrl}/og-image.png` },
      { name: 'twitter:url', content: siteUrl },
      { name: 'twitter:image', content: `${siteUrl}/twitter-image.png` },
    ],
    link: [
      { rel: 'canonical', href: siteUrl },
    ],
  })
})

