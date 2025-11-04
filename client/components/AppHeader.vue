<template>
  <header class="bg-mono-bg border-b-2 border-mono-border">
    <div class="container mx-auto px-8 py-2 flex items-center justify-between">
      
      <!-- Left: Logo & Brand -->
      <div class="flex-shrink-0 flex items-center gap-2">
        <NuxtLink to="/" class="flex items-center">
          <img 
            :src="logoPath" 
            alt="BitNerve Logo" 
            class="h-10 w-auto"
          />
        </NuxtLink>
        <div class="flex flex-col">
          <NuxtLink to="/" class="text-primary font-bold text-xl leading-tight tracking-tight">
            BitNerve
          </NuxtLink>
          <div class="flex items-baseline gap-2">
            <span class="text-mono-secondary text-[10px] font-semibold leading-none">AI-Powered Crypto Trading</span>
          </div>
        </div>
      </div>

      <!-- Center: Navigation Links -->
      <!-- <nav class="flex items-center gap-3 text-primary uppercase text-sm font-bold tracking-wider mx-8">
        <a href="#" class="hover:text-mono-accent transition-colors">LIVE</a>
        <span class="text-mono-border font-normal">|</span>
        <a href="#" class="hover:text-mono-accent transition-colors">LEADERBOARD</a>
        <span class="text-mono-border font-normal">|</span>
        <a href="#" class="hover:text-mono-accent transition-colors">BLOG</a>
        <span class="text-mono-border font-normal">|</span>
        <a href="#" class="hover:text-mono-accent transition-colors">MODELS</a>
      </nav> -->

      <!-- Right: Action Links -->
      <div class="flex items-center gap-3 flex-shrink-0">        
        <button
          @click="handleRefresh"
          class="p-2 border border-mono-border hover:bg-mono-hover transition-colors text-primary ml-2"
          aria-label="Refresh page"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
        <button
          @click="toggleTheme"
          class="p-2 border border-mono-border hover:bg-mono-hover transition-colors text-primary"
          aria-label="Toggle theme"
        >
          <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
          </svg>
          <svg v-if="!isDark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
          </svg>
        </button>
      </div>

    </div>
  </header>
</template>

<script setup lang="ts">
const { isDark, toggleTheme } = useTheme()

const logoPath = computed(() => {
  return isDark.value ? '/logo-white.png' : '/logo-black.png'
})

const handleRefresh = () => {
  if (process.client) {
    window.location.reload()
  }
}
</script>

<style scoped>
.container {
  max-width: 1920px;
}
</style>

