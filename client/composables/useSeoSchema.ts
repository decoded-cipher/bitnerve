export const useSeoSchema = () => {
  const config = useRuntimeConfig()
  const siteUrl = config.public.site.url

  const generateOrganizationSchema = () => {
    return {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "BitNerve",
      url: siteUrl,
      logo: `${siteUrl}/logo.png`,
      description: "Real-time AI trading dashboard for monitoring cryptocurrency portfolio performance",
      sameAs: ["https://twitter.com/aitrading", "https://github.com/aitrading"],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "Customer Support",
        email: "support@aitrading.app",
      },
    }
  }

  const generateBreadcrumbSchema = (items: Array<{ name: string; url: string }>) => {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    }
  }

  const generateFaqSchema = (items: Array<{ question: string; answer: string }>) => {
    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    }
  }

  return {
    generateOrganizationSchema,
    generateBreadcrumbSchema,
    generateFaqSchema,
  }
}
