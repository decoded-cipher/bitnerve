export const useTheme = () => {
  const isDark = ref(false)

  const updateTheme = () => {
    if (process.client) {
      if (isDark.value) {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }

  const initTheme = () => {
    if (process.client) {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        isDark.value = savedTheme === 'dark'
      } else {
        // Check system preference if no saved theme
        // const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        // isDark.value = prefersDark
        isDark.value = false
      }
      updateTheme()
    }
  }

  const toggleTheme = () => {
    isDark.value = !isDark.value
    if (process.client) {
      localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
      updateTheme()
    }
  }

  // Initialize theme on mount
  onMounted(() => {
    initTheme()
  })

  // Watch for changes to update DOM
  watch(isDark, () => {
    updateTheme()
  })

  return {
    isDark: readonly(isDark),
    toggleTheme,
    initTheme,
  }
}

