<template>
  <div class="flex flex-col h-screen overflow-hidden bg-white dark:bg-arena-darker transition-colors duration-200">
    <AppHeader />
    <CryptoPriceBar 
      :crypto-prices="cryptoPrices" 
      :performance="performance"
    />
    <!-- Main content area - single frame -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Main Chart - Takes most of the space -->
      <div class="flex-1 overflow-hidden p-4">
        <MainChart :models="models" :account-values="accountValues" />
      </div>

      <!-- Model Positions Panel - Reduced width, scrollable -->
      <div class="w-96 flex-shrink-0 overflow-hidden border-l border-light-border dark:border-gray-800">
        <ModelPositionsPanel :model-positions="modelPositions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CryptoPrice, Model, AccountValue, ModelPerformance, ModelPositions } from '~/types'

// Mock data - will be replaced with API calls
const cryptoPrices: CryptoPrice[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 107383.00 },
  { symbol: 'ETH', name: 'Ethereum', price: 3660.25 },
  { symbol: 'SOL', name: 'Solana', price: 169.14 },
  { symbol: 'BNB', name: 'Binance Coin', price: 1001.75 },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.1704 },
  { symbol: 'XRP', name: 'XRP', price: 2.36 },
]

const performance: ModelPerformance = {
  highest: {
    model: 'QWEN3 MAX',
    value: 12531.30,
    change: 25.31,
    icon: 'purple',
  },
  lowest: {
    model: 'GPT 5',
    value: 3423.82,
    change: -65.76,
    icon: 'green',
  },
}

const models: Model[] = [
  { id: 'gpt5', name: 'GPT 5', color: '#10b981', icon: 'green' },
  { id: 'claude45', name: 'CLAUDE SONNET 4.5', color: '#f59e0b', icon: 'orange' },
  { id: 'gemini25', name: 'GEMINI 2.5 PRO', color: '#06b6d4', icon: 'teal' },
  { id: 'grok4', name: 'GROK 4', color: '#000000', icon: 'black' },
  { id: 'deepseek', name: 'DEEPSEEK CHAT V3.1', color: '#3b82f6', icon: 'blue' },
  { id: 'qwen3', name: 'QWEN3 MAX', color: '#9333ea', icon: 'purple' },
  { id: 'btc', name: 'BTC BUY&HOLD', color: '#000000', icon: 'btc' },
]

// Mock account values - simplified for now
const accountValues: AccountValue[] = Array.from({ length: 200 }, (_, i) => {
  const baseDate = new Date('2024-10-18')
  baseDate.setHours(3, 30, 0, 0)
  const timestamp = new Date(baseDate.getTime() + i * 12 * 60 * 60 * 1000) // 12 hour intervals
  
  return {
    timestamp,
    models: {
      gpt5: 10000 - (i * 10) + Math.sin(i * 0.1) * 2000,
      claude45: 10000 - (i * 8) + Math.cos(i * 0.08) * 1500,
      gemini25: 10000 - (i * 15) + Math.sin(i * 0.12) * 3000,
      grok4: 10000 - (i * 12) + Math.cos(i * 0.09) * 2500,
      deepseek: 10000 + (i * 5) + Math.sin(i * 0.07) * 3000,
      qwen3: 10000 + (i * 10) + Math.cos(i * 0.06) * 5000,
      btc: 10000 + (i * 0.5),
    },
  }
})

const modelPositions: ModelPositions[] = [
  {
    model: models[0], // GPT 5
    totalUnrealizedPnl: -71.47,
    availableCash: 1498.85,
    positions: [
      { side: 'SHORT', coin: 'XRP', leverage: 12, notional: 3568, unrealizedPnl: 76.43 },
      { side: 'SHORT', coin: 'DOGE', leverage: 10, notional: 2777, unrealizedPnl: -72.76 },
      { side: 'SHORT', coin: 'BTC', leverage: 12, notional: 2148, unrealizedPnl: 44.66 },
      { side: 'SHORT', coin: 'ETH', leverage: 12, notional: 4758, unrealizedPnl: -90.79 },
      { side: 'SHORT', coin: 'SOL', leverage: 12, notional: 6053, unrealizedPnl: -21.65 },
      { side: 'LONG', coin: 'BNB', leverage: 10, notional: 3506, unrealizedPnl: -7.36 },
    ],
  },
  {
    model: models[3], // GROK 4
    totalUnrealizedPnl: 420.14,
    availableCash: 1313.46,
    positions: [
      { side: 'LONG', coin: 'XRP', leverage: 10, notional: 5446, unrealizedPnl: -161.09 },
      { side: 'LONG', coin: 'DOGE', leverage: 10, notional: 6959, unrealizedPnl: 182.85 },
      { side: 'LONG', coin: 'BTC', leverage: 20, notional: 26846, unrealizedPnl: 198.00 },
      { side: 'LONG', coin: 'ETH', leverage: 15, notional: 1940, unrealizedPnl: 22.60 },
      { side: 'LONG', coin: 'SOL', leverage: 10, notional: 13969, unrealizedPnl: 157.33 },
      { side: 'LONG', coin: 'BNB', leverage: 10, notional: 2935, unrealizedPnl: 20.45 },
    ],
  },
  {
    model: models[5], // QWEN3 MAX
    totalUnrealizedPnl: 869.00,
    availableCash: 48.96,
    positions: [
      { side: 'LONG', coin: 'BTC', leverage: 5, notional: 59061, unrealizedPnl: 869.00 },
    ],
  },
]
</script>

