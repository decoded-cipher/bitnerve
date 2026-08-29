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
const { isDark } = useTheme()
const chartContainer = ref<HTMLElement | null>(null)
const containerHeight = ref(600)

const palette = computed(() => isDark.value
  ? { label: '#cccccc', axis: '#3e3e3e', grid: '#2f2f2f', mode: 'dark' as const }
  : { label: '#0a0a0a', axis: '#000000', grid: '#e5e5e5', mode: 'light' as const })

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

// One x slot per data point, plus an empty slot at every gap in time
const chartLayout = computed(() => {
  const timestamps = props.accountValues.map(av => av.timestamp.getTime())
  const MIN_GAP = 60 * 60 * 1000 // 1 hour threshold

  const categories: Array<number | null> = []
  const sources: Array<number | null> = []

  props.accountValues.forEach((av, index) => {
    if (index > 0 && timestamps[index] - timestamps[index - 1] > MIN_GAP) {
      categories.push(null)
      sources.push(null)
    }
    categories.push(timestamps[index])
    sources.push(index)
  })

  return { categories, sources }
})

// Plots total account value over time
const chartSeries = computed(() => {
  const { sources } = chartLayout.value

  return props.models.map(model => ({
    name: model.name,
    data: sources.map((source, slot) => ({
      x: slot,
      y: source === null ? null : (props.accountValues[source].models[model.id] ?? null),
    })),
    color: model.color,
    strokeDashArray: model.name === 'BTC BUY&HOLD' ? 5 : 0,
  }))
})

// Generate category labels for x-axis
const xAxisCategories = computed(() => chartLayout.value.categories)

const Y_TARGET_TICKS = 6

const niceStep = (raw: number): number => {
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const fraction = raw / magnitude
  const snapped = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return snapped * magnitude
}

const yAxisScale = computed(() => {
  let lowest = Infinity
  let highest = -Infinity

  for (const av of props.accountValues) {
    for (const value of Object.values(av.models)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) continue
      if (value < lowest) lowest = value
      if (value > highest) highest = value
    }
  }

  if (lowest > highest) {
    return { min: undefined, max: undefined, tickAmount: Y_TARGET_TICKS, decimals: 0 }
  }

  const band = Math.max(highest - lowest, Math.abs(highest) * 0.005, 0.01)
  const step = niceStep(band / Y_TARGET_TICKS)
  const padding = band * 0.05

  const min = Math.floor((lowest - padding) / step) * step
  const max = Math.ceil((highest + padding) / step) * step
  const decimals = step >= 1
    ? (Number.isInteger(step) ? 0 : 1)
    : Math.min(8, Math.ceil(-Math.log10(step)))

  return {
    min: Number(min.toFixed(decimals)),
    max: Number(max.toFixed(decimals)),
    tickAmount: Math.max(2, Math.round((max - min) / step)),
    decimals,
  }
})

// Chart options
const chartOptions = computed(() => {
  const { min: yAxisMin, max: yAxisMax, tickAmount, decimals } = yAxisScale.value
  const { label, axis, grid, mode } = palette.value

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
      borderColor: grid,
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
          colors: label,
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
        color: axis
      },
      axisTicks: {
        show: true,
        borderType: 'solid',
        color: axis
      },
    },
    yaxis: {
      min: yAxisMin,
      max: yAxisMax,
      tickAmount: tickAmount,
      labels: {
        style: {
          colors: label,
          fontSize: '10px',
          fontWeight: 600,
          fontFamily: 'Space Mono, monospace',
        },
        offsetX: -15,
        offsetY: 0,
        formatter: (val: number) => `$${val.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}`,
      },
      axisBorder: {
        show: true,
        color: axis
      },
      axisTicks: {
        show: true,
        borderType: 'solid',
        color: axis
      },
    },
    legend: {
      show: true,
      position: 'right' as const,
      floating: false,
      fontSize: '10px',
      fontFamily: 'Space Mono, monospace',
      fontWeight: 400,
      labels: {
        colors: label,
      },
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
      theme: mode,
      style: {
        fontFamily: 'Space Mono, monospace',
        fontSize: '11px',
      },
      x: {
        formatter: (val: number, opts: any) => {
          const timestamp = xAxisCategories.value[val]
          if (timestamp === null || timestamp === undefined) return ''
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
      mode,
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

