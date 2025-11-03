// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
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
    transpile: ['radix-vue', 'apexcharts'],
  },
})

