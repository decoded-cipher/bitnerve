<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const { isDark } = useTheme()

useHead({
  htmlAttrs: {
    class: computed(() => (isDark.value ? 'dark' : '')),
  },
  meta: [
    { name: 'theme-color', content: computed(() => (isDark.value ? '#1e1e1e' : '#ffffff')) },
  ],
})
</script>
