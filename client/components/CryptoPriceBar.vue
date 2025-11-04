<template>
  <div class="bg-mono-surface border-b-2 border-mono-border">
    <div class="container mx-auto px-6 py-3">
      <div class="flex items-center justify-between">
        <!-- Crypto Prices -->
        <div class="flex items-center space-x-8">
          <div
            v-for="crypto in cryptoPrices"
            :key="crypto.symbol"
            class="flex items-center space-x-2"
          >
            <span class="text-xs font-bold text-primary uppercase tracking-wider">{{ crypto.symbol }}</span>
            <span class="text-xs text-secondary">{{ formatPrice(crypto.price) }}</span>
          </div>
        </div>

        <!-- Performance Summary -->
        <div class="flex items-center space-x-6">
          <div class="flex items-center space-x-2">
            <span class="text-xs text-secondary uppercase tracking-wider">Highest:</span>
            <span class="text-xs font-bold text-primary">{{ highest.model }}</span>
            <span class="text-xs text-secondary">{{ formatPrice(highest.value) }}</span>
            <span class="text-xs font-bold text-primary">+{{ highest.change }}%</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-xs text-secondary uppercase tracking-wider">Lowest:</span>
            <span class="text-xs font-bold text-primary">{{ lowest.model }}</span>
            <span class="text-xs text-secondary">{{ formatPrice(lowest.value) }}</span>
            <span class="text-xs font-bold text-primary">{{ lowest.change }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CryptoPrice, ModelPerformance } from '~/types'
import { formatNumber } from '~/composables/useNumberFormat'

interface Props {
  cryptoPrices: CryptoPrice[]
  performance: ModelPerformance
}

const props = defineProps<Props>()

const highest = computed(() => props.performance.highest)
const lowest = computed(() => props.performance.lowest)

const formatPrice = (price: number): string => {
  const formatted = formatNumber(price)
  return `$${formatted}`
}
</script>

<style scoped>
.container {
  max-width: 1920px;
}
</style>

