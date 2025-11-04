<template>
  <div class="border-b border-mono-border pb-3 last:border-b-0 p-4">
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
</template>

<script setup lang="ts">
import { formatNumber } from '~/composables/useNumberFormat'

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

interface Props {
  trade: CompletedTrade
}

defineProps<Props>()

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
