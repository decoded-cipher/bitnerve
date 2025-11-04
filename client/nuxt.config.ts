// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
      title: "BitNerve - Real-Time Crypto Trading Performance",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Monitor and compare AI trading models in real-time. Track crypto portfolio performance, positions, and trading analytics across multiple AI agents.",
        },
        {
          name: "keywords",
          content:
            "AI trading, crypto trading, trading dashboard, portfolio tracker, trading models, cryptocurrency, DeFi, algorithmic trading",
        },
        { name: "author", content: "Arjun Krishna" },
        { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
        { name: "theme-color", content: "#0a0a0a" },

        // Open Graph / Social Media Meta Tags
        { property: "og:type", content: "website" },
        { property: "og:url", content: "og:url" },
        { property: "og:title", content: "BitNerve - Real-Time Crypto Trading Performance" },
        {
          property: "og:description",
          content:
            "Monitor and compare AI trading models in real-time. Track crypto portfolio performance, positions, and trading analytics.",
        },
        { property: "og:image", content: "/logo.png" },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:site_name", content: "BitNerve" },

        // Twitter Card Meta Tags
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:url", content: "twitter:url" },
        { name: "twitter:title", content: "BitNerve - Real-Time Crypto Trading Performance" },
        {
          name: "twitter:description",
          content:
            "Monitor and compare AI trading models. Track performance, positions, and analytics across multiple AI trading agents.",
        },
        { name: "twitter:image", content: "/logo.png" },

        // Additional SEO Meta Tags
        { name: "apple-mobile-web-app-capable", content: "yes" },
        { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
        { name: "format-detection", content: "telephone=no" },
      ],
      link: [
        {
          rel: 'preconnect',
          href: 'https://fonts.googleapis.com',
        },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
        },
        // Canonical URL
        {
          rel: "canonical",
          content: "canonical",
        },
        // Favicons
        {
          rel: "icon",
          type: "image/x-icon",
          href: "/favicon.ico",
        },
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/favicon.svg",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "16x16",
          href: "/favicon-16x16.png",
        },
        {
          rel: "icon",
          type: "image/png",
          sizes: "32x32",
          href: "/favicon-32x32.png",
        },
        // Apple Touch Icon (180x180 is the standard for modern iOS)
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/icons/light/apple-touch-icon.png",
        },
        // Preload critical resources
        {
          rel: "preload",
          as: "font",
          href: "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap",
          crossorigin: "",
        },
      ],
      script: [
        {
          type: "application/ld+json",
          innerHTML: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "BitNerve",
            description:
              "Real-time monitoring and comparison of AI trading models with cryptocurrency portfolio analytics",
            url: process.env.NUXT_PUBLIC_SITE_URL || "",
            applicationCategory: "FinanceApplication",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: "4.8",
              ratingCount: "250",
            },
          }),
        },
        // {
        //   async: true,
        //   src: "https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID",
        // },
        // {
        //   innerHTML: `
        //     window.dataLayer = window.dataLayer || [];
        //     function gtag(){dataLayer.push(arguments);}
        //     gtag('js', new Date());
        //     gtag('config', 'GA_MEASUREMENT_ID', {
        //       page_path: window.location.pathname,
        //     });
        //   `,
        //   type: "text/javascript",
        // },
      ],
    },
  },

  typescript: {
    strict: true,
    typeCheck: false, // Disable type checking during dev to avoid vue-tsc issues
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  modules: ["radix-vue/nuxt"],

  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL,
    name: "BitNerve",
  },

  build: {
    transpile: ['radix-vue', 'apexcharts', 'vue3-apexcharts'],
  },
  vite: {
    optimizeDeps: {
      include: ['apexcharts'],
      esbuildOptions: {
        resolveExtensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json'],
      },
    },
    resolve: {
      alias: {
        // Force ESM build of apexcharts for both direct and indirect imports
        'apexcharts': 'apexcharts/dist/apexcharts.esm.js',
      },
    },
  },
  runtimeConfig: {
    postgresUser: process.env.NUXT_POSTGRES_USER || '',
    postgresPassword: process.env.NUXT_POSTGRES_PASSWORD || '',
    postgresHost: process.env.NUXT_POSTGRES_HOST || '',
    postgresPort: process.env.NUXT_POSTGRES_PORT || '',
    postgresDb: process.env.NUXT_POSTGRES_DB || '',
    dbConnectionString: process.env.NUXT_DB_CONNECTION_STRING || '',
    nodeEnv: process.env.NUXT_NODE_ENV || '',
    
    public: {
      site: {
        url: process.env.NUXT_PUBLIC_SITE_URL,
        name: "BitNerve",
      },
    },
  },
})

