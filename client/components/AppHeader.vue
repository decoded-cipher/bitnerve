<template>
  <header class="bg-mono-bg border-b border-mono-border">
    <div class="container mx-auto px-6 py-4 flex items-center justify-between">
      <!-- Logo -->
      <div class="flex-shrink-0">
        <div class="text-primary">
          <div class="font-bold text-2xl leading-tight tracking-tight">ALPHA</div>
          <div class="flex items-baseline">
            <span class="text-base leading-tight tracking-tight">ARENA</span>
            <span class="text-xs text-secondary ml-2 font-normal">by Nof1</span>
          </div>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="flex items-center space-x-3 text-primary uppercase text-xs tracking-wider mx-4">
        <a href="#" class="hover:text-mono-accent transition-colors">LIVE</a>
        <span class="text-mono-border">/</span>
        <a href="#" class="hover:text-mono-accent transition-colors">LEADERBOARD</a>
        <span class="text-mono-border">/</span>
        <a href="#" class="hover:text-mono-accent transition-colors">BLOG</a>
        <span class="text-mono-border">/</span>
        <a href="#" class="hover:text-mono-accent transition-colors">MODELS</a>
      </nav>

      <!-- Action Links & Theme Toggle -->
      <div class="flex items-center space-x-4 flex-shrink-0">
        <a href="#" class="text-secondary hover:text-primary transition-colors text-xs uppercase tracking-wider whitespace-nowrap">
          JOIN WAITLIST
        </a>
        <a href="#" class="text-secondary hover:text-primary transition-colors text-xs uppercase tracking-wider whitespace-nowrap">
          ABOUT NOF1
        </a>
        <!-- Theme Toggle -->
        <button
          @click="toggleTheme"
          class="p-2 border border-mono-border hover:bg-mono-hover transition-colors text-primary"
          aria-label="Toggle theme"
        >
          <svg v-if="isDark" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364 6.364l-1.591 1.591M21 12H18.75m-3.75-3.75H21m-4.773 4.773l-1.591 1.591M12 18.75V21m-4.773-4.773l-1.591-1.591M5.25 12H3m3.75-3.75H3m3.659 1.591l-1.591-1.591m0 0L5.25 5.25m13.364 13.364L18.75 18.75" />
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
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

