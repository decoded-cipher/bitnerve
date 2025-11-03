export default defineNuxtPlugin(async (nuxtApp) => {
  // Only run on client side
  if (import.meta.client) {
    // Import using dynamic import with explicit handling
    const vue3ApexChartsModule = await import('vue3-apexcharts')
    
    // vue3-apexcharts exports a Vue plugin
    // Handle the case where it might be wrapped
    const plugin = vue3ApexChartsModule.default || vue3ApexChartsModule
    
    // Register the plugin which will register the apexchart component
    nuxtApp.vueApp.use(plugin)
  }
})
