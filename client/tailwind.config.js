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
        'arena-dark': '#1a1a1a',
        'arena-darker': '#0f0f0f',
        'arena-light': '#2a2a2a',
        'arena-accent': '#4a90e2',
        // Light mode colors
        'light-bg': '#ffffff',
        'light-surface': '#f8f9fa',
        'light-border': '#e5e7eb',
        'light-text': '#111827',
        'light-text-secondary': '#6b7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

