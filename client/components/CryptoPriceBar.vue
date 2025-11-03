<template>
  <div class="bg-light-surface dark:bg-arena-dark border-b border-light-border dark:border-gray-800 transition-colors duration-200">
    <div class="container mx-auto px-4 py-3">
      <div class="flex items-center justify-between">
        <!-- Crypto Prices -->
        <div class="flex items-center space-x-6">
          <div
            v-for="crypto in cryptoPrices"
            :key="crypto.symbol"
            class="flex items-center space-x-2"
          >
            <span class="text-sm font-semibold text-primary">{{ crypto.symbol }}</span>
            <span class="text-sm text-primary">{{ formatPrice(crypto.price) }}</span>
          </div>
        </div>

        <!-- Performance Summary -->
        <div class="flex items-center space-x-4">
          <div class="flex items-center space-x-2">
            <span class="text-xs text-secondary uppercase">Highest:</span>
            <span class="text-sm font-semibold text-primary">{{ highest.model }}</span>
            <span class="text-sm text-primary">{{ formatPrice(highest.value) }}</span>
            <span class="text-green-600 dark:text-green-500 text-sm">+{{ highest.change }}%</span>
          </div>
          <div class="flex items-center space-x-2">
            <span class="text-xs text-secondary uppercase">Lowest:</span>
            <span class="text-sm font-semibold text-primary">{{ lowest.model }}</span>
            <span class="text-sm text-primary">{{ formatPrice(lowest.value) }}</span>
            <span class="text-red-600 dark:text-red-500 text-sm">{{ lowest.change }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CryptoPrice, ModelPerformance } from '~/types'

interface Props {
  cryptoPrices: CryptoPrice[]
  performance: ModelPerformance
}

const props = defineProps<Props>()

const { highest, lowest } = toRefs(props.performance)

const formatPrice = (price: number): string => {
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `$${price.toFixed(4)}`
}
</script>

<style scoped>
.container {
  max-width: 1920px;
}
</style>

