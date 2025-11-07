<template>
  <div class="h-full flex flex-col card-surface p-6 border-none">
    <!-- <h2 class="text-center text-sm font-bold mb-6 text-primary uppercase tracking-wider">
      TOTAL ACCOUNT VALUE
    </h2> -->
    
    <!-- Chart Container -->
    <div ref="chartContainer" class="flex-1 min-h-0" style="position: relative;">
      <div v-if="loading" class="flex items-center justify-center h-full">
        <div class="text-secondary text-xs">Loading chart data...</div>
      </div>
      <div v-else-if="accountValues.length === 0 || models.length === 0" class="flex items-center justify-center h-full">
        <div class="text-secondary text-xs">No chart data available</div>
      </div>
      <ClientOnly v-else>
        <apexchart
          v-if="containerHeight > 0"
          type="line"
          :height="containerHeight"
          :options="chartOptions"
          :series="chartSeries"
          class="w-full"
        />
        <template #fallback>
          <div class="flex items-center justify-center h-full">
            <div class="text-secondary text-xs">Loading chart...</div>
          </div>
        </template>
      </ClientOnly>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Model, AccountValue } from '~/types'
import { formatNumber } from '~/composables/useNumberFormat'

interface Props {
  models: Model[]
  accountValues: AccountValue[]
  loading?: boolean
}

const props = defineProps<Props>()
const chartContainer = ref<HTMLElement | null>(null)
const containerHeight = ref(600)

// Calculate chart height based on container
const updateChartHeight = () => {
  nextTick(() => {
    if (chartContainer.value) {
      containerHeight.value = chartContainer.value.clientHeight || 600
    }
  })
}

onMounted(() => {
  updateChartHeight()
  window.addEventListener('resize', updateChartHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateChartHeight)
})

// Get models with current values
// accountValues contains total account value = current_balance + unrealized PnL
// This includes both realized PnL (in current_balance via total_pnl) and unrealized PnL from open positions
const modelsWithValues = computed(() => {
  if (props.accountValues.length === 0) return props.models.map(m => ({ ...m, currentValue: 10000 }))
  const latest = props.accountValues[props.accountValues.length - 1]
  return props.models.map(model => ({
    ...model,
    // latest.models[model.id] is the total account value (account_value from database)
    currentValue: latest.models[model.id] || 10000
  }))
})

// Prepare chart series
// This plots TOTAL ACCOUNT VALUE over time:
// - account_value = current_balance (includes realized PnL) + unrealized PnL from open positions
// - Includes both realized PnL from closed positions (via total_pnl) and unrealized PnL from open positions
const chartSeries = computed(() => {
  // Detect gaps in the data
  const timestamps = props.accountValues.map(av => av.timestamp.getTime())
  const MIN_GAP = 60 * 60 * 1000 // 1 hour threshold
  
  return props.models.map(model => {
    const data: Array<{ x: number; y: number | null }> = []
    
    props.accountValues.forEach((av, index) => {
      // Check if there's a large gap from previous point
      if (index > 0) {
        const prevTimestamp = timestamps[index - 1]
        const currentTimestamp = timestamps[index]
        const gap = currentTimestamp - prevTimestamp
        
        if (gap > MIN_GAP) {
          // Insert a null point to break the line
          data.push({ x: index, y: null })
        }
      }
      
      data.push({
        x: index,
        y: av.models[model.id] ?? null,
      })
    })
    
    return {
      name: model.name,
      data: data,
      color: model.color,
      strokeDashArray: model.name === 'BTC BUY&HOLD' ? 5 : 0,
    }
  })
})

// Generate category labels for x-axis
const xAxisCategories = computed(() => {
  return props.accountValues.map(av => av.timestamp.getTime())
})

// Chart options
const chartOptions = computed(() => {
  
  const allValues = props.accountValues.flatMap(av => 
    Object.values(av.models)
  )
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 15000
  const yAxisMax = Math.max(15000, Math.ceil(maxValue / 2500) * 2500)
  const yAxisMin = Math.floor(Math.min(...allValues) / 2500) * 2500

  return {
    chart: {
      type: 'line' as const,
      height: '100%',
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      animations: {
        enabled: true,
        easing: 'easeinout' as const,
        speed: 800,
      },
      background: 'transparent',
      fontFamily: 'Space Mono, monospace',
    },
    stroke: {
      curve: 'smooth' as const,
      width: 1.5,
    },
    colors: props.models.map(m => m.color),
    dataLabels: {
      enabled: false,
    },
    grid: {
      borderColor: '#e5e5e5',
      strokeDashArray: 0,
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
      padding: {
        left: -2,
        right: 0,
      },
    },
    xaxis: {
      type: 'category',
      tickAmount: 7,
      categories: xAxisCategories.value,
      labels: {
        style: {
          colors: '#000000',
          fontSize: '10px',
          fontWeight: 600,
          fontFamily: 'Space Mono, monospace',
        },
        formatter: (val: string) => {
          const date = new Date(parseInt(val))
          if (isNaN(date.getTime())) return ''
          
          return date.toLocaleString('en-US', { 
            month: 'short', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          })
        },
      },
      axisBorder: {
        show: true,
        color: '#000000'
      },
      axisTicks: {
        show: true,
        borderType: 'solid',
        color: '#000000'
      },
    },
    yaxis: {
      min: yAxisMin,
      max: yAxisMax,
      tickAmount: Math.ceil((yAxisMax - yAxisMin) / 2500),
      labels: {
        style: {
          colors: '#000000',
          fontSize: '10px',
          fontWeight: 600,
          fontFamily: 'Space Mono, monospace',
        },
        offsetX: -15,
        offsetY: 0,
        formatter: (val: number) => {
          if (val === 0) return '$0'
          return `$${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
        },
      },
      axisBorder: {
        show: true,
        color: '#000000'
      },
      axisTicks: {
        show: true,
        borderType: 'solid',
        color: '#000000'
      },
    },
    legend: {
      show: true,
      position: 'right' as const,
      floating: false,
      fontSize: '10px',
      fontFamily: 'Space Mono, monospace',
      fontWeight: 400,
      formatter: (seriesName: string, opts: any) => {
        const model = props.models.find(m => m.name === seriesName)
        if (!model) return seriesName
        const currentValue = modelsWithValues.value.find(m => m.id === model.id)?.currentValue || 0
        return formatPrice(currentValue)
      },
      markers: {
        width: 8,
        height: 8,
        radius: 0,
      },
      itemMargin: {
        horizontal: 10,
        vertical: 2,
      },
      offsetX: 0,
      offsetY: 0,
    },
    tooltip: {
      theme: 'light',
      style: {
        fontFamily: 'Space Mono, monospace',
        fontSize: '11px',
      },
      x: {
        formatter: (val: number, opts: any) => {
          const timestamp = xAxisCategories.value[val]
          const date = new Date(timestamp)
          return date.toLocaleString('en-US', { 
            month: 'short', 
            day: '2-digit', 
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          })
        },
      },
      y: {
        formatter: (val: number) => `$${formatNumber(val)}`,
      },
    },
    theme: {
      mode: 'light' as const,
    },
    // annotations: {
    //   points: [],
    //   text: [
    //     {
    //       x: '0%',
    //       y: '100%',
    //       textAnchor: 'start',
    //       fontSize: '10px',
    //       fontFamily: 'Space Mono, monospace',
    //       fontWeight: 400,
    //       fillColor: '#737373',
    //       opacity: 0.5,
    //       xAdjust: 10,
    //       yAdjust: -10,
    //     },
    //     {
    //       x: '100%',
    //       y: '100%',
    //       textAnchor: 'end',
    //       fontSize: '10px',
    //       fontFamily: 'Space Mono, monospace',
    //       fontWeight: 400,
    //       fillColor: '#737373',
    //       opacity: 0.5,
    //       xAdjust: -10,
    //       yAdjust: -10,
    //     },
    //   ],
    // },
  } as any
})

const formatPrice = (price: number): string => {
  const formatted = formatNumber(price)
  return `$${formatted}`
}
</script>

<style scoped>
/* Ensure chart container takes full height */
.apexcharts-canvas {
  height: 100% !important;
}
</style>

