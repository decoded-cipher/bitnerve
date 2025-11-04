<template>
  <div class="border-b border-mono-border pb-4 last:border-b-0 p-4">
    <div class="flex flex-col space-y-2 text-xs font-mono relative">
      
      <!-- Header: Model completed trade type on date -->
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-1.5 flex-wrap">
          <!-- <img
            v-if="modelIcon"
            :src="modelIcon"
            :alt="trade.model_name"
            class="w-4 h-4 object-contain rounded-full border border-mono-secondary p-0.1"
            @error="handleImageError"
          /> -->
          <span class="text-mono-text">
            <span class="font-bold uppercase">{{ trade.model_name }}</span> completed a
          </span>
          <span :class="['font-bold uppercase', tradeTypeColor]">
            {{ tradeType }}
          </span>
          <span class="text-mono-text">trade on</span>
          <div class="flex items-center gap-1.5">
            <!-- <img
              v-if="coinIcon"
              :src="coinIcon"
              :alt="trade.coin"
              class="w-4 h-4 object-contain"
              @error="handleImageError"
            /> -->
            <span class="text-primary font-bold uppercase">{{ trade.coin }}!</span>
          </div>
        </div>
      </div>

      <!-- Trade Details -->
      <div class="flex flex-col text-mono-text-secondary p-2 text-[10.5px] bg-mono-surface rounded border border-mono-surface-hover">
        <div
          v-for="detail in tradeDetails"
          :key="detail.label"
          class="flex"
        >
          <span class="text-mono-text-secondary w-[160px] flex-shrink-0">{{ detail.label }}</span>
          <span class="text-mono-text">: {{ detail.value }}</span>
        </div>
      </div>

      <!-- Net P&L -->
      <div class="flex items-center font-bold text-sm gap-1">
        <span class="text-mono-text-primary">NET P&L:</span>
        <span :class="[pnlColor]">
          {{ formattedPnl }}
        </span>
      </div>

      <div class="text-mono-text-secondary absolute right-0 bottom-0 text-[10px]">
        {{ formattedDate }}
      </div>
      
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from '~/composables/useNumberFormat'
import { getCoinIcon, getModelIcon } from '~/config/assets'

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

interface TradeDetailItem {
  label: string
  value: string
}

const props = defineProps<Props>()

// Helper functions
const formatPrice = (price: number): string => {
  return `$${formatNumber(price)}`
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

// Computed properties
const modelIcon = computed(() => getModelIcon(props.trade.model_name))
const coinIcon = computed(() => getCoinIcon(props.trade.coin))
const tradeType = computed(() => props.trade.trade_type.toLowerCase())
const tradeTypeColor = computed(() => 
  tradeType.value === 'long trade' ? 'text-green-600' : 'text-red-600'
)
const pnlColor = computed(() => 
  props.trade.net_pnl >= 0 ? 'text-green-600' : 'text-red-600'
)

const formattedDate = computed(() => {
  const date = new Date(props.trade.completed_at)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  let hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12
  return `${month}/${day}, ${hours}:${minutes} ${ampm}`
})

const formattedPnl = computed(() => {
  const sign = props.trade.net_pnl >= 0 ? '+' : '-'
  const formatted = formatNumber(Math.abs(props.trade.net_pnl))
  return `${sign}$${formatted}`
})

const tradeDetails = computed<TradeDetailItem[]>(() => [
  {
    label: 'Price (Entry → Exit)',
    value: `${formatPrice(props.trade.entry_price)} → ${formatPrice(props.trade.exit_price)}`,
  },
  {
    label: 'Quantity',
    value: formatNumber(props.trade.quantity),
  },
  {
    label: 'Notional (Trade Size)',
    value: `${formatPrice(props.trade.notional_entry)} → ${formatPrice(props.trade.notional_exit)}`,
  },
  {
    label: 'Holding time',
    value: props.trade.holding_time,
  },
])
</script>