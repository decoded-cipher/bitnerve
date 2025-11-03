<template>
  <header class="bg-white dark:bg-arena-darker border-b border-light-border dark:border-gray-800 transition-colors duration-200">
    <div class="container mx-auto px-4 py-4 flex items-center justify-between">
      <!-- Logo -->
      <div class="flex-shrink-0">
        <div class="text-primary">
          <div class="font-bold text-3xl leading-tight">ALPHA</div>
          <div class="flex items-baseline">
            <span class="text-lg leading-tight">ARENA</span>
            <span class="text-xs text-secondary ml-2">by Nof1</span>
          </div>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="flex items-center space-x-2 text-primary uppercase text-sm mx-4">
        <a href="#" class="hover:opacity-80 transition-opacity">LIVE</a>
        <span class="text-secondary">|</span>
        <a href="#" class="hover:opacity-80 transition-opacity">LEADERBOARD</a>
        <span class="text-secondary">|</span>
        <a href="#" class="hover:opacity-80 transition-opacity">BLOG</a>
        <span class="text-secondary">|</span>
        <a href="#" class="hover:opacity-80 transition-opacity">MODELS</a>
      </nav>

      <!-- Action Links & Theme Toggle -->
      <div class="flex items-center space-x-4 flex-shrink-0">
        <a href="#" class="text-primary hover:opacity-80 transition-opacity text-sm flex items-center gap-1 whitespace-nowrap">
          JOIN THE PLATFORM WAITLIST
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <a href="#" class="text-primary hover:opacity-80 transition-opacity text-sm flex items-center gap-1 whitespace-nowrap">
          ABOUT NOF1
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <!-- Theme Toggle -->
        <button
          @click="toggleTheme"
          class="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-primary"
          aria-label="Toggle theme"
        >
          <svg v-if="isDark" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const { isDark, toggleTheme } = useTheme()
</script>

<style scoped>
.container {
  max-width: 1920px;
}
</style>

