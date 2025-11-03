<template>
  <div class="h-full flex flex-col bg-white dark:bg-arena-dark transition-colors duration-200">
    <!-- Tabs -->
    <div class="flex space-x-2 p-4 border-b border-light-border dark:border-gray-800 flex-shrink-0">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="[
          'px-3 py-2 rounded text-xs uppercase font-semibold transition-colors',
          activeTab === tab ? 'tab-active' : 'tab-inactive'
        ]"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- Filter -->
    <div class="p-4 border-b border-light-border dark:border-gray-800 flex-shrink-0">
      <select class="bg-light-surface dark:bg-gray-800 text-primary text-xs px-3 py-2 rounded border border-light-border dark:border-gray-700 w-full focus:outline-none focus:ring-2 focus:ring-arena-accent">
        <option>FILTER: ALL MODELS ▼</option>
      </select>
    </div>

    <!-- Model Positions - Scrollable -->
    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <div
        v-for="modelData in modelPositions"
        :key="modelData.model.id"
        class="mb-6"
      >
        <!-- Model Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
          <div class="flex items-center space-x-2">
            <div
              class="w-3 h-3 rounded-full flex-shrink-0"
              :style="{ backgroundColor: modelData.model.color }"
            ></div>
            <span class="font-bold text-sm text-primary">{{ modelData.model.name }}</span>
          </div>
          <div :class="[
            'text-xs sm:text-sm font-semibold whitespace-nowrap',
            modelData.totalUnrealizedPnl >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
          ]">
            TOTAL UNREALIZED P&L: {{ formatPnl(modelData.totalUnrealizedPnl) }}
          </div>
        </div>

        <!-- Positions Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead class="bg-light-surface dark:bg-gray-800 text-secondary">
              <tr>
                <th class="px-2 py-2 text-left">SIDE</th>
                <th class="px-2 py-2 text-left">COIN</th>
                <th class="px-2 py-2 text-left">LEVERAGE</th>
                <th class="px-2 py-2 text-left">NOTIONAL</th>
                <th class="px-2 py-2 text-left">EXIT PLAN</th>
                <th class="px-2 py-2 text-left">UNREAL P&L</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(position, index) in modelData.positions"
                :key="index"
                class="border-b border-light-border dark:border-gray-700 hover:bg-light-surface dark:hover:bg-gray-800 transition-colors"
              >
                <td class="px-2 py-2 text-primary">{{ position.side }}</td>
                <td class="px-2 py-2 text-primary">{{ position.coin }}</td>
                <td class="px-2 py-2 text-primary">{{ position.leverage }}X</td>
                <td class="px-2 py-2 text-primary">{{ formatPrice(position.notional) }}</td>
                <td class="px-2 py-2">
                  <button class="text-arena-accent hover:opacity-80 transition-opacity">VIEW</button>
                </td>
                <td :class="[
                  'px-2 py-2 font-semibold',
                  position.unrealizedPnl >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                ]">
                  {{ formatPnl(position.unrealizedPnl) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Available Cash -->
        <div class="mt-3 text-xs text-secondary">
          AVAILABLE CASH: {{ formatPrice(modelData.availableCash) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModelPositions } from '~/types'

interface Props {
  modelPositions: ModelPositions[]
}

const props = defineProps<Props>()

const tabs = ['ALL', '72H', 'COMPLETED TRADES', 'MODELCHAT', 'POSITIONS', 'README.TXT']
const activeTab = ref('POSITIONS')

const formatPrice = (price: number): string => {
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `$${price.toFixed(4)}`
}

const formatPnl = (pnl: number): string => {
  const sign = pnl >= 0 ? '+' : ''
  if (Math.abs(pnl) >= 1) {
    return `${sign}$${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `${sign}$${pnl.toFixed(2)}`
}
</script>

<style scoped>
/* Scrollbar styling */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>

