<template>
  <div>
    <CompletedTradeCard
      v-for="trade in completedTrades"
      :key="trade.id"
      :trade="trade"
    />
    <div v-if="completedTrades.length === 0" class="text-center text-secondary text-xs py-8">
      No completed trades yet
    </div>
  </div>
</template>

<script setup lang="ts">
import CompletedTradeCard from '~/components/activity/partials/TradeCard.vue'

interface CompletedTrade {
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
}

// Fetch completed trades
const { data: completedTradesData } = await useFetch<CompletedTrade[]>('/api/completed-trades')
const completedTrades = computed(() => Array.isArray(completedTradesData.value) ? completedTradesData.value : [])
</script>
