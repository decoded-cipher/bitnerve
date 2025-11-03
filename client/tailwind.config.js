/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  theme: {
    extend: {
      colors: {
        // Monochrome palette - uses CSS variables for dark mode
        'mono-bg': 'var(--mono-bg)',
        'mono-surface': 'var(--mono-surface)',
        'mono-border': 'var(--mono-border)',
        'mono-text': 'var(--mono-text)',
        'mono-text-secondary': 'var(--mono-text-secondary)',
        'mono-text-muted': 'var(--mono-text-muted)',
        'mono-accent': 'var(--mono-accent)',
        'mono-hover': 'var(--mono-hover)',
        // Legacy support (will be phased out)
        'arena-dark': '#1a1a1a',
        'arena-darker': '#0f0f0f',
        'arena-light': '#2a2a2a',
        'arena-accent': '#171717',
        'light-bg': '#ffffff',
        'light-surface': '#fafafa',
        'light-border': '#e5e5e5',
        'light-text': '#0a0a0a',
        'light-text-secondary': '#737373',
      },
      fontFamily: {
        sans: ['Space Mono', 'monospace'],
        mono: ['Space Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

