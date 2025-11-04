<template>
  <div class="mb-6">
    <!-- Model Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
      <div class="flex items-center space-x-2">
        <div
          class="w-2 h-2 flex-shrink-0"
          :style="{ backgroundColor: modelPositions.model.color }"
        ></div>
        <span class="font-bold text-xs text-primary uppercase tracking-tight">{{ modelPositions.model.name }}</span>
      </div>
      <div :class="[
        'text-xs font-bold whitespace-nowrap',
        modelPositions.totalUnrealizedPnl >= 0 ? 'text-primary' : 'text-mono-text-secondary'
      ]">
        TOTAL UNREALIZED P&L: {{ formatPnl(modelPositions.totalUnrealizedPnl) }}
      </div>
    </div>

    <!-- Positions Table -->
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead class="bg-mono-surface text-secondary uppercase tracking-wider">
          <tr>
            <th class="px-2 py-2 text-left font-bold">SIDE</th>
            <th class="px-2 py-2 text-left font-bold">COIN</th>
            <th class="px-2 py-2 text-left font-bold">NOTIONAL</th>
            <th class="px-2 py-2 text-left font-bold">UNREAL P&L</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(position, index) in modelPositions.positions"
            :key="index"
            class="border-b border-mono-border hover:bg-mono-surface transition-colors"
          >
            <td class="px-2 py-2 text-primary font-bold uppercase">{{ position.side }}</td>
            <td class="px-2 py-2 text-primary">{{ position.coin }}</td>
            <td class="px-2 py-2 text-secondary">{{ formatPrice(position.notional) }}</td>
            <td :class="[
              'px-2 py-2 font-bold',
              position.unrealizedPnl >= 0 ? 'text-primary' : 'text-mono-text-secondary'
            ]">
              {{ formatPnl(position.unrealizedPnl) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Available Cash -->
    <div class="mt-3 text-xs text-secondary uppercase tracking-wider">
      AVAILABLE CASH: {{ formatPrice(modelPositions.availableCash) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModelPositions } from '~/types'
import { formatNumber } from '~/composables/useNumberFormat'

interface Props {
  modelPositions: ModelPositions
}

defineProps<Props>()

const formatPrice = (price: number): string => {
  const formatted = formatNumber(price)
  return `$${formatted}`
}

const formatPnl = (pnl: number): string => {
  const sign = pnl >= 0 ? '+' : ''
  const formatted = formatNumber(pnl)
  return `${sign}$${formatted}`
}
</script>
