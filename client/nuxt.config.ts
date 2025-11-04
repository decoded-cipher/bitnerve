// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  app: {
    head: {
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
      ],
    },
  },
  typescript: {
    strict: true,
    typeCheck: false  // Disable type checking during dev to avoid vue-tsc issues
  },
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  modules: ['radix-vue/nuxt'],
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
      // apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
    },
  },
})

