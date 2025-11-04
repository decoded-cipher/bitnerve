<template>
  <div class="flex flex-col h-full">
    <div class="flex-1 overflow-y-auto">
      <CompletedTradeCard
        v-for="trade in completedTrades"
        :key="trade.id"
        :trade="trade"
      />
      <div v-if="completedTrades.length === 0 && !pending" class="text-center text-secondary text-xs py-8">
        No completed trades yet
      </div>
      <div v-if="pending" class="text-center text-secondary text-xs py-8">
        Loading...
      </div>
    </div>
    
    <!-- Pagination Controls -->
    <Pagination
      :pagination="pagination"
      :pending="pending"
      @page-change="goToPage"
    />
  </div>
</template>

<script setup lang="ts">
import CompletedTradeCard from '~/components/activity/partials/TradeCard.vue'
import Pagination from '~/components/activity/Pagination.vue'

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

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface CompletedTradesResponse {
  data: CompletedTrade[]
  pagination: PaginationInfo
}

// Pagination state
const currentPage = ref(1)
const pageSize = 10

// Fetch completed trades with pagination
const { data: completedTradesData, pending } = useFetch<CompletedTradesResponse>(
  () => `/api/completed-trades?page=${currentPage.value}&limit=${pageSize}`
)

const completedTrades = computed(() => {
  if (!completedTradesData.value) return []
  if ('data' in completedTradesData.value) {
    return completedTradesData.value.data
  }
  // Fallback for old API format
  return Array.isArray(completedTradesData.value) ? completedTradesData.value : []
})

const pagination = computed<PaginationInfo | null>(() => {
  if (!completedTradesData.value) return null
  if ('pagination' in completedTradesData.value) {
    return completedTradesData.value.pagination
  }
  return null
})

const goToPage = (page: number) => {
  if (page >= 1 && pagination.value && page <= pagination.value.totalPages) {
    currentPage.value = page
  }
}
</script>
