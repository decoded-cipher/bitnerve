<template>
  <div class="p-4 border-b-2 border-mono-border flex flex-col space-y-4" :style="cardStyle">
    
    <!-- Model Header -->
    <div class="flex items-center space-x-2">
      <img
        v-if="modelIcon"
        :src="modelIcon"
        :alt="modelPositions.model.name"
        class="w-8 h-8 object-contain rounded-full border border-mono-divider p-0.5 icon-chip"
        @error="handleImageError"
      />
      <span class="font-bold text-sm uppercase tracking-tight" :style="{ color: accent }">{{ modelPositions.model.name }}</span>
    </div>

    <!-- Positions Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-[11px]">
        <thead class="border-b border-mono-divider">
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
              position.side === 'LONG' ? 'text-mono-up' : 'text-mono-down'
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
            <td class="px-2 py-1 text-mono-up font-bold">{{ formatPrice(position.notional) }}</td>
            <!-- <td class="px-2 1">
              <button
                class="px-3 py-1 border border-mono-divider bg-mono-bg text-primary text-xs font-bold uppercase hover:bg-mono-hover transition-colors"
                @click="handleViewExitPlan(position)"
              >
                VIEW
              </button>
            </td> -->
            <td :class="[
              'px-2 py-1 font-bold',
              position.unrealizedPnl >= 0 ? 'text-mono-up' : 'text-mono-down'
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
      <div :class="['text-xs', modelPositions.totalUnrealizedPnl >= 0 ? 'text-mono-up' : 'text-mono-down']">
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
const { isDark } = useTheme()

const modelIcon = computed(() => getModelIcon(props.modelPositions.model.name))
const modelColor = computed(() => getModelColor(props.modelPositions.model.name))

const ACCENTS: Record<string, { light: string; dark: string }> = {
  gray: { light: '#374151', dark: '#d1d5db' },
  green: { light: '#15803d', dark: '#4ade80' },
  orange: { light: '#c2410c', dark: '#fb923c' },
  sky: { light: '#0369a1', dark: '#38bdf8' },
  blue: { light: '#1d4ed8', dark: '#60a5fa' },
  purple: { light: '#7e22ce', dark: '#c084fc' },
}

const accent = computed(() => {
  const entry = ACCENTS[modelColor.value] || ACCENTS.blue
  return isDark.value ? entry.dark : entry.light
})

const cardStyle = computed(() => ({
  backgroundColor: `color-mix(in srgb, ${accent.value} 10%, var(--mono-bg))`,
}))

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
