<template>
  <div class="bg-mono-surface border-b-2 border-mono-border">
    <div class="container mx-auto px-6 py-2.5">
      <div v-if="loading" class="flex items-center justify-center">
        <div class="text-secondary text-xs">Loading data...</div>
      </div>
      <div v-else class="flex items-center justify-between">
        
        <!-- Crypto Prices -->
        <div class="flex items-center space-x-4">
          <template v-for="(crypto, index) in displayCryptoPrices" :key="crypto.symbol">
            <div class="flex items-center space-x-2">
              <img
                v-if="crypto.icon"
                :src="crypto.icon"
                :alt="crypto.symbol"
                class="w-8 h-8 object-contain rounded-full border border-gray-300 p-0.5"
                @error="handleImageError"
              />
              <span class="text-xs font-bold text-primary uppercase tracking-wider">{{ crypto.symbol }}</span>
              <span class="text-xs text-secondary">{{ formatPrice(crypto.price) }}</span>
            </div>
            <div v-if="index < displayCryptoPrices.length - 1" class="h-4 w-px bg-gray-300"></div>
          </template>
        </div>

        <!-- Performance Summary -->
        <div class="flex items-center space-x-6">
          <div class="flex items-center space-x-3">
            <!-- <span class="text-xs text-secondary uppercase tracking-wider">Highest:</span> -->
            <img
              v-if="highestIcon"
              :src="highestIcon"
              :alt="highest.model"
              class="w-8 h-8 object-contain rounded-full border border-gray-300 p-0.5"
              @error="handleImageError"
            />
            <span class="text-xs text-mono-text-secondary font-bold">{{ highest.model }}</span>
            <span class="text-xs font-bold text-primary">{{ formatPrice(highest.value) }}</span>
            <span :class="[
              'text-xs font-bold',
              highest.change >= 0 ? 'text-green-600' : 'text-red-600'
            ]">
              {{ formatChange(highest.change) }}
            </span>
          </div>
          
          <!-- <div class="h-4 w-px bg-gray-300"></div>
          
          <div class="flex items-center space-x-2">
            <span class="text-xs text-secondary uppercase tracking-wider">Lowest:</span>
            <img
              v-if="lowestIcon"
              :src="lowestIcon"
              :alt="lowest.model"
              class="w-8 h-8 object-contain rounded-full border border-gray-300 p-0.5"
              @error="handleImageError"
            />
            <span class="text-xs font-bold text-primary">{{ lowest.model }}</span>
            <span class="text-xs text-secondary">{{ formatPrice(lowest.value) }}</span>
            <span :class="[
              'text-xs font-bold',
              lowest.change >= 0 ? 'text-green-600' : 'text-red-600'
            ]">
              {{ formatChange(lowest.change) }}
            </span>
          </div> -->

        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CryptoPrice, ModelPerformance } from '~/types'
import { formatNumber } from '~/composables/useNumberFormat'
import { getModelIcon, getCoinIcon } from '~/config/assets'

interface Props {
  cryptoPrices: CryptoPrice[]
  performance: ModelPerformance
  loading?: boolean
}

interface CryptoPriceWithIcon extends CryptoPrice {
  icon: string
}

const props = defineProps<Props>()

const highest = computed(() => props.performance.highest)
const lowest = computed(() => props.performance.lowest)

// Resolve icon paths from coin symbols returned by API
const highestIcon = computed(() => {
  if (!highest.value?.icon) return ''
  // API returns coin symbol, resolve to icon path
  return getModelIcon(highest.value.icon)
})

const lowestIcon = computed(() => {
  if (!lowest.value?.icon) return ''
  // API returns coin symbol, resolve to icon path
  return getModelIcon(lowest.value.icon)
})

const displayCryptoPrices = computed<CryptoPriceWithIcon[]>(() =>
  props.cryptoPrices.map(crypto => ({
    ...crypto,
    icon: getCoinIcon(crypto.symbol),
  }))
)

const formatPrice = (price: number): string => {
  const formatted = formatNumber(price)
  return `$${formatted}`
}

const formatChange = (change: number): string => {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}%`
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}
</script>

<style scoped>
.container {
  max-width: 1920px;
}
</style>

