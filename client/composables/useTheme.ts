export const useTheme = () => {
  const cookie = useCookie<'light' | 'dark' | undefined>('theme', {
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  const isDark = useState('theme-dark', () => cookie.value === 'dark')

  const initTheme = () => {
    if (!import.meta.client) return
    if (!cookie.value) {
      const saved = localStorage.getItem('theme')
      if (saved === 'dark' || saved === 'light') {
        isDark.value = saved === 'dark'
        cookie.value = saved
      }
    }
  }

  const toggleTheme = () => {
    isDark.value = !isDark.value
    cookie.value = isDark.value ? 'dark' : 'light'
    if (import.meta.client) localStorage.setItem('theme', cookie.value)
  }

  onMounted(initTheme)

  return {
    isDark: readonly(isDark),
    toggleTheme,
    initTheme,
  }
}
