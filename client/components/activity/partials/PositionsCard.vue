<template>
  <div :class="[backgroundColorClass, 'p-4 border-b-2 border-mono-border flex flex-col space-y-4']">
    
    <!-- Model Header -->
    <div class="flex items-center space-x-2">
      <img
        v-if="modelIcon"
        :src="modelIcon"
        :alt="modelPositions.model.name"
        class="w-8 h-8 object-contain rounded-full border border-mono-border p-0.5"
        @error="handleImageError"
      />
      <span :class="['font-bold text-sm uppercase tracking-tight', textColorClass]">{{ modelPositions.model.name }}</span>
    </div>

    <!-- Positions Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-[11px]">
        <thead class="border-b border-mono-border">
          <tr>
            <th class="px-2 py-1 text-left text-secondary uppercase tracking-wider">SIDE</th>
            <th class="px-2 py-1 text-left text-secondary uppercase tracking-wider">COIN</th>
            <th class="px-2 py-1 text-left text-secondary uppercase tracking-wider">LEV.</th>
            <th class="px-2 py-1 text-left text-secondary uppercase tracking-wider">NOTIONAL</th>
            <!-- <th class="px-2 py-1 text-left text-secondary uppercase tracking-wider">EXIT PLAN</th> -->
            <th class="px-2 py-1 text-left text-secondary uppercase tracking-wider">UPNL</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(position, index) in modelPositions.positions"
            :key="index"
          >
            <td :class="[
              'px-2 py-1 font-bold uppercase',
              position.side === 'LONG' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            ]">
              {{ position.side }}
            </td>
            <td class="px-2 py-1">
              <div class="flex items-center space-x-2">
                <img
                  v-if="getCoinIconPath(position.coin)"
                  :src="getCoinIconPath(position.coin)"
                  :alt="position.coin"
                  class="w-4 h-4 object-contain flex-shrink-0"
                  @error="handleImageError"
                />
                <span class="text-primary font-bold">{{ position.coin }}</span>
              </div>
            </td>
            <td class="px-2 py-1 text-primary">{{ position.leverage }}X</td>
            <td class="px-2 py-1 text-green-600 dark:text-green-400 font-bold">{{ formatPrice(position.notional) }}</td>
            <!-- <td class="px-2 1">
              <button
                class="px-3 py-1 border border-mono-border bg-mono-bg text-primary text-xs font-bold uppercase hover:bg-mono-hover transition-colors"
                @click="handleViewExitPlan(position)"
              >
                VIEW
              </button>
            </td> -->
            <td :class="[
              'px-2 py-1 font-bold',
              position.unrealizedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            ]">
              {{ formatPnl(position.unrealizedPnl) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Available Cash -->
    <div class="flex flex-col uppercase tracking-wider font-bold space-y-1">
      <div class="text-secondary text-[10px]">
        AVAILABLE CASH: {{ formatPrice(modelPositions.availableCash) }}
      </div>
      <div :class="['text-xs', modelPositions.totalUnrealizedPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400']">
        TOTAL UNREALIZED P&L: {{ formatPnl(modelPositions.totalUnrealizedPnl) }}
      </div>
    </div>
    
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ModelPositions } from '~/types'
import { formatNumber } from '~/composables/useNumberFormat'
import { getCoinIcon, getModelIcon, getModelColor } from '~/config/assets'

interface Props {
  modelPositions: ModelPositions
}

const props = defineProps<Props>()

const modelIcon = computed(() => getModelIcon(props.modelPositions.model.name))
const modelColor = computed(() => getModelColor(props.modelPositions.model.name))

// Map color names to Tailwind classes with dark mode support
const backgroundColorClass = computed(() => {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-50 dark:bg-gray-900',
    green: 'bg-green-50 dark:bg-green-900/20',
    orange: 'bg-orange-50 dark:bg-orange-900/20',
    sky: 'bg-sky-50 dark:bg-sky-900/20',
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
  }
  return colorMap[modelColor.value] || 'bg-blue-50 dark:bg-blue-900/20'
})

const textColorClass = computed(() => {
  const colorMap: Record<string, string> = {
    gray: 'text-gray-800 dark:text-gray-200',
    green: 'text-green-800 dark:text-green-300',
    orange: 'text-orange-800 dark:text-orange-300',
    sky: 'text-sky-800 dark:text-sky-300',
    blue: 'text-blue-800 dark:text-blue-300',
    purple: 'text-purple-800 dark:text-purple-300',
  }
  return colorMap[modelColor.value] || 'text-blue-800 dark:text-blue-300'
})

const formatPrice = (price: number): string => {
  const formatted = formatNumber(price)
  return `$${formatted}`
}

const formatPnl = (pnl: number): string => {
  const sign = pnl >= 0 ? '+' : ''
  const formatted = formatNumber(pnl)
  return `${sign}$${formatted}`
}

const getCoinIconPath = (coin: string): string => {
  return getCoinIcon(coin)
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

const handleViewExitPlan = (position: any) => {
  // TODO: Implement exit plan view functionality
  console.log('View exit plan for:', position)
}
</script>
