<template>
  <div class="flex flex-col h-screen overflow-hidden bg-mono-bg">
    
    <!-- <AppHeader /> -->
    <CryptoPriceBar 
      :crypto-prices="cryptoPrices" 
      :performance="performance"
      :loading="isPricesLoading || isPerformanceLoading"
    />
    
    <div class="flex-1 flex overflow-hidden">
      <div class="flex-1 flex flex-col overflow-hidden">
        <MainChart 
          :models="models" 
          :account-values="accountValues"
          :loading="isAccountsLoading || isAccountValuesLoading"
        />

        <div class="h-28 p-4 text-center text-xs text-secondary border-t border-mono-border">
          Data updated every 5 minutes. Last updated at {{ new Date().toLocaleTimeString() }}.
        </div>
      </div>

      <div class="w-96 flex-shrink-0 overflow-hidden">
        <ActivityPanel 
          :model-positions="modelPositions" 
          :models="models"
          :loading="isAccountsLoading || isPositionsLoading"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useHead, useFetch, computed } from '#imports'
import type { CryptoPrice, Model, AccountValue, ModelPerformance, ModelPositions } from '~/types'

useHead({
  title: 'AI Trading Dashboard - Real-Time Crypto Trading Performance',
  meta: [
    {
      name: 'description',
      content: 'Monitor and compare AI trading models in real-time. Track crypto portfolio performance, positions, and trading analytics across multiple AI agents. Advanced dashboard with performance metrics and live data updates.',
    },
    {
      name: 'keywords',
      content: 'AI trading, crypto trading dashboard, portfolio tracker, trading models, cryptocurrency analytics, DeFi, algorithmic trading, real-time monitoring',
    },
    {
      property: 'og:title',
      content: 'AI Trading Dashboard - Real-Time Crypto Trading Performance',
    },
    {
      property: 'og:description',
      content: 'Monitor and compare AI trading models. Advanced dashboard with real-time performance metrics and trading analytics.',
    },
    {
      property: 'og:type',
      content: 'website',
    },
  ],
})

// Monochrome color palette - different shades of gray/black
const MONO_COLORS = [
  '#0a0a0a', // Black
  '#404040', // Dark gray
  '#737373', // Medium gray
  '#a3a3a3', // Light gray
  '#525252', // Darker medium
  '#171717', // Very dark gray
  '#d4d4d4', // Lighter gray
]

// Fetch accounts (models)
const { data: accountsData, pending: isAccountsLoading } = await useFetch<Array<{
  id: string
  model_name: string
  initial_balance: number
  current_balance: number
  total_pnl: number
  created_at: Date
  updated_at: Date
}>>('/api/accounts')
const accounts = computed(() => Array.isArray(accountsData.value) ? accountsData.value : [])

// Function to get model color and icon based on model name
const getModelStyle = (modelName: string, index: number) => {
  // Use monochrome colors - assign different shades based on index
  const colorIndex = index % MONO_COLORS.length
  return { 
    color: MONO_COLORS[colorIndex], 
    icon: 'mono' // Simple icon identifier
  }
}

// Map accounts to models with colors
const models = computed<Model[]>(() => {
  return accounts.value.map((account, index: number) => {
    const style = getModelStyle(account.model_name || '', index)
    // Format model name: convert slashes to spaces and make it readable
    const formattedName = (account.model_name || `Model ${index + 1}`)
      .replace(/\//g, ' ')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .toUpperCase()
    
    return {
      id: account.id,
      name: formattedName,
      color: style.color,
      icon: style.icon,
    }
  })
})

// Fetch account values
const { data: accountValuesData, pending: isAccountValuesLoading } = await useFetch<Array<{
  timestamp: string | Date
  models: Record<string, number>
}>>('/api/account-values')
const accountValues = computed<AccountValue[]>(() => {
  const data = Array.isArray(accountValuesData.value) ? accountValuesData.value : []
  return data.map((item) => ({
    timestamp: new Date(item.timestamp),
    models: item.models || {},
  }))
})

// Fetch positions
const { data: positionsData, pending: isPositionsLoading } = await useFetch<Array<{
  account_id: string
  total_unrealized_pnl: number
  available_cash: number
  positions: Array<{
    symbol: string
    side: string
    quantity: number
    current_price: number
    unrealized_pnl: number
    leverage: number
  }>
}>>('/api/positions')
const modelPositions = computed<ModelPositions[]>(() => {
  const data = Array.isArray(positionsData.value) ? positionsData.value : []
  const modelMap = new Map(models.value.map(m => [m.id, m]))
  
  return data.map((accountPositions) => {
    const model = modelMap.get(accountPositions.account_id)
    if (!model) return null
    
    return {
      model,
      totalUnrealizedPnl: accountPositions.total_unrealized_pnl || 0,
      availableCash: Math.max(0, accountPositions.available_cash || 0),
      positions: accountPositions.positions.map((pos) => ({
        side: pos.side as 'LONG' | 'SHORT',
        coin: pos.symbol,
        leverage: pos.leverage,
        notional: Math.abs(pos.quantity * pos.current_price),
        unrealizedPnl: pos.unrealized_pnl,
      })),
    }
  }).filter((item): item is ModelPositions => item !== null)
})

// Fetch crypto prices
const { data: cryptoPricesData, pending: isPricesLoading } = await useFetch<CryptoPrice[]>('/api/crypto-prices')
const cryptoPrices = computed<CryptoPrice[]>(() => {
  return Array.isArray(cryptoPricesData.value) ? cryptoPricesData.value : []
})

// Fetch performance
const { data: performanceData, pending: isPerformanceLoading } = await useFetch<{
  highest: {
    model: string
    value: number
    change: number
    icon: string
  } | null
  lowest: {
    model: string
    value: number
    change: number
    icon: string
  } | null
}>('/api/performance')
const performance = computed<ModelPerformance>(() => {
  const data = performanceData.value
  if (!data || !data.highest || !data.lowest) {
    return {
      highest: {
        model: 'N/A',
        value: 0,
        change: 0,
        icon: 'purple',
      },
      lowest: {
        model: 'N/A',
        value: 0,
        change: 0,
        icon: 'green',
      },
    }
  }
  
  return {
    highest: data.highest,
    lowest: data.lowest,
  }
})
</script>

