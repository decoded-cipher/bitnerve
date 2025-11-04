<template>
  <div class="h-full flex flex-col bg-mono-bg">
    <!-- Tabs -->
    <div class="flex">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="[
          'w-full px-3 py-2 text-xs uppercase font-bold tracking-wider transition-colors relative border-b-2 border-l-2 border-mono-border',
          activeTab === tab ? 'tab-active' : 'tab-inactive'
        ]"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- Filter -->
    <!-- <div class="p-4 border-b-2 border-l-2 border-mono-border flex-shrink-0">
      <select class="bg-mono-surface text-primary text-xs px-3 py-2 border border-mono-border w-full focus:outline-none focus:border-mono-accent uppercase tracking-wider">
        <option>FILTER: ALL MODELS ▼</option>
      </select>
    </div> -->

    <!-- Tab Content -->
    <div class="flex-1 overflow-y-auto border-l-2 border-mono-border">
      
      <!-- COMPLETED TRADES Tab -->
      <div v-if="activeTab === 'COMPLETED TRADES'">
        
        <!-- <div class="mb-4 text-xs text-secondary uppercase tracking-wider">
          Showing Last 100 Trades
        </div> -->
        
        <div
          v-for="trade in completedTrades"
          :key="trade.id"
          class="border-b border-mono-border pb-3 last:border-b-0 p-4"
        >
          <div class="flex flex-col space-y-1 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-bold text-primary uppercase">{{ trade.model_name }}</span>
              <span class="text-secondary">{{ formatDateTime(trade.completed_at) }}</span>
            </div>
            <div class="text-secondary">{{ trade.trade_type }}</div>
            <div class="flex items-center justify-between">
              <span class="text-primary font-bold">{{ trade.coin }}</span>
              <span class="text-secondary">
                {{ formatPrice(trade.entry_price) }} → {{ formatPrice(trade.exit_price) }}
              </span>
            </div>
            <div class="flex items-center justify-between text-secondary">
              <span>Qty: {{ formatQuantity(trade.quantity) }}</span>
              <span>
                {{ formatPrice(trade.notional_entry) }} → {{ formatPrice(trade.notional_exit) }}
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-secondary">Holding: {{ trade.holding_time }}</span>
              <span :class="[
                'font-bold',
                trade.net_pnl >= 0 ? 'text-primary' : 'text-mono-text-secondary'
              ]">
                {{ formatPnl(trade.net_pnl) }}
              </span>
            </div>
          </div>
        </div>
        
        <div v-if="completedTrades.length === 0" class="text-center text-secondary text-xs py-8">
          No completed trades yet
        </div>

      </div>

      <!-- MODELCHAT Tab -->
      <div v-if="activeTab === 'MODELCHAT'" class="p-4 space-y-4">
        <div
          v-for="message in modelChatMessages"
          :key="message.id"
          class="border-2 rounded-sm p-4"
          :style="{ borderColor: getModelColor(message.account_id) }"
        >
          <div class="flex items-start space-x-3 mb-2">
            <div
              class="w-8 h-8 flex items-center justify-center rounded-sm flex-shrink-0 font-bold text-xs"
              :style="{ 
                backgroundColor: getModelColor(message.account_id),
                color: '#fff'
              }"
            >
              {{ getModelInitial(message.model_name) }}
            </div>
            <div class="flex-1">
              <div class="flex items-center justify-between mb-1">
                <span class="font-bold text-xs text-primary uppercase">{{ message.model_name }}</span>
                <span class="text-xs text-secondary">{{ message.timestamp }}</span>
              </div>
              <div class="text-xs text-primary leading-relaxed">
                {{ truncateMessage(message.message) }}
              </div>
              <div class="text-right mt-2">
                <button
                  @click="toggleMessageExpansion(message.id)"
                  class="text-xs text-secondary hover:text-primary transition-colors uppercase tracking-wider"
                >
                  {{ expandedMessages.has(message.id) ? 'click to collapse' : 'click to expand' }}
                </button>
              </div>
              <div
                v-if="expandedMessages.has(message.id)"
                class="mt-2 text-xs text-primary leading-relaxed whitespace-pre-wrap"
              >
                {{ message.message }}
              </div>
            </div>
          </div>
        </div>
        <div v-if="modelChatMessages.length === 0" class="text-center text-secondary text-xs py-8">
          No messages yet
        </div>
      </div>

      <!-- POSITIONS Tab -->
      <div v-if="activeTab === 'POSITIONS'" class="p-4 space-y-6">
        <div
          v-for="modelData in modelPositions"
          :key="modelData.model.id"
          class="mb-6"
        >
          <!-- Model Header -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
            <div class="flex items-center space-x-2">
              <div
                class="w-2 h-2 flex-shrink-0"
                :style="{ backgroundColor: modelData.model.color }"
              ></div>
              <span class="font-bold text-xs text-primary uppercase tracking-tight">{{ modelData.model.name }}</span>
            </div>
            <div :class="[
              'text-xs font-bold whitespace-nowrap',
              modelData.totalUnrealizedPnl >= 0 ? 'text-primary' : 'text-mono-text-secondary'
            ]">
              TOTAL UNREALIZED P&L: {{ formatPnl(modelData.totalUnrealizedPnl) }}
            </div>
          </div>

          <!-- Positions Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="bg-mono-surface text-secondary uppercase tracking-wider">
                <tr>
                  <th class="px-2 py-2 text-left font-bold">SIDE</th>
                  <th class="px-2 py-2 text-left font-bold">COIN</th>
                  <!-- <th class="px-2 py-2 text-left font-bold">LEVERAGE</th> -->
                  <th class="px-2 py-2 text-left font-bold">NOTIONAL</th>
                  <!-- <th class="px-2 py-2 text-left font-bold">EXIT PLAN</th> -->
                  <th class="px-2 py-2 text-left font-bold">UNREAL P&L</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(position, index) in modelData.positions"
                  :key="index"
                  class="border-b border-mono-border hover:bg-mono-surface transition-colors"
                >
                  <td class="px-2 py-2 text-primary font-bold uppercase">{{ position.side }}</td>
                  <td class="px-2 py-2 text-primary">{{ position.coin }}</td>
                  <!-- <td class="px-2 py-2 text-primary">{{ position.leverage }}X</td> -->
                  <td class="px-2 py-2 text-secondary">{{ formatPrice(position.notional) }}</td>
                  <!-- <td class="px-2 py-2">
                    <button class="text-primary hover:text-mono-accent transition-colors uppercase tracking-wider text-xs">VIEW</button>
                  </td> -->
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
            AVAILABLE CASH: {{ formatPrice(modelData.availableCash) }}
          </div>
        </div>
        <div v-if="modelPositions.length === 0" class="text-center text-secondary text-xs py-8">
          No open positions
        </div>
      </div>

      
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModelPositions, Model } from '~/types'
import { formatNumber } from '~/composables/useNumberFormat'

interface Props {
  modelPositions: ModelPositions[]
  models: Model[]
}

const props = defineProps<Props>()

const tabs = ['COMPLETED TRADES', 'MODELCHAT', 'POSITIONS']
const activeTab = ref('COMPLETED TRADES')
const expandedMessages = ref(new Set<string>())

// Fetch completed trades
const { data: completedTradesData } = await useFetch<Array<{
  id: string
  model_name: string
  trade_type: string
  coin: string
  completed_at: string
  entry_price: number
  exit_price: number
  quantity: number
  notional_entry: number
  notional_exit: number
  holding_time: string
  net_pnl: number
}>>('/api/completed-trades')
const completedTrades = computed(() => Array.isArray(completedTradesData.value) ? completedTradesData.value : [])

// Fetch model chat messages
const { data: modelChatData } = await useFetch<Array<{
  id: string
  account_id: string
  model_name: string
  message: string
  timestamp: string
  created_at: string
}>>('/api/model-chat')
const modelChatMessages = computed(() => Array.isArray(modelChatData.value) ? modelChatData.value : [])

// Helper functions
const getModelColor = (accountId: string): string => {
  const model = props.models.find(m => m.id === accountId)
  return model?.color || '#737373'
}

const getModelInitial = (modelName: string): string => {
  // Extract first letter from model name
  const words = modelName.split(' ')
  if (words.length > 0) {
    return words[0].charAt(0).toUpperCase()
  }
  return modelName.charAt(0).toUpperCase()
}

const toggleMessageExpansion = (messageId: string) => {
  if (expandedMessages.value.has(messageId)) {
    expandedMessages.value.delete(messageId)
  } else {
    expandedMessages.value.add(messageId)
  }
}

const truncateMessage = (message: string, maxLength: number = 200): string => {
  if (message.length <= maxLength) return message
  return message.substring(0, maxLength) + '...'
}

const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}/${day} ${hours}:${minutes}`
}

const formatPrice = (price: number): string => {
  const formatted = formatNumber(price)
  return `$${formatted}`
}

const formatQuantity = (quantity: number): string => {
  return formatNumber(quantity)
}

const formatPnl = (pnl: number): string => {
  const sign = pnl >= 0 ? '+' : ''
  const formatted = formatNumber(pnl)
  return `${sign}$${formatted}`
}
</script>

<style scoped>
/* Scrollbar styling */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #e5e5e5;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #d4d4d4;
}
</style>
