<template>
  <div class="h-full flex flex-col card-surface p-6">
    <h2 class="text-center text-sm font-bold mb-6 text-primary uppercase tracking-wider">
      TOTAL ACCOUNT VALUE
    </h2>
    
    <!-- Chart Container -->
    <div ref="chartContainer" class="flex-1 min-h-0" style="position: relative;">
      <ClientOnly>
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

    <!-- Legend -->
    <div class="grid grid-cols-7 gap-4 mt-6 pt-6 border-t border-mono-border">
      <div
        v-for="model in modelsWithValues"
        :key="model.id"
        class="flex items-center space-x-2"
      >
        <div
          class="w-2 h-2 flex-shrink-0"
          :style="{ backgroundColor: model.color }"
        ></div>
        <div class="text-xs min-w-0">
          <div class="font-bold text-primary truncate uppercase tracking-tight">{{ model.name }}</div>
          <div class="text-secondary text-xs">{{ formatPrice(model.currentValue) }}</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-4 text-xs text-secondary">
      <a href="https://nof1.ai" class="hover:text-primary transition-colors">https://nof1.ai</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Model, AccountValue } from '~/types'

interface Props {
  models: Model[]
  accountValues: AccountValue[]
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
const modelsWithValues = computed(() => {
  if (props.accountValues.length === 0) return props.models.map(m => ({ ...m, currentValue: 10000 }))
  const latest = props.accountValues[props.accountValues.length - 1]
  return props.models.map(model => ({
    ...model,
    currentValue: latest.models[model.id] || 10000
  }))
})

// Prepare chart series
const chartSeries = computed(() => {
  return props.models.map(model => {
    const data = props.accountValues.map(av => ({
      x: av.timestamp.getTime(),
      y: av.models[model.id] || 10000
    }))
    
    return {
      name: model.name,
      data: data,
      color: model.color,
      strokeDashArray: model.name === 'BTC BUY&HOLD' ? 5 : 0,
    }
  })
})

// Chart options
const chartOptions = computed(() => {
  return {
    chart: {
      type: 'line' as const,
      height: '100%',
      toolbar: {
        show: true,
        tools: {
          download: true,
          selection: false,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
          reset: true,
        },
      },
      zoom: {
        enabled: true,
        type: 'x' as const,
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
      strokeDashArray: 2,
      xaxis: {
        lines: {
          show: false,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    xaxis: {
      type: 'datetime',
      labels: {
        style: {
          colors: '#737373',
          fontSize: '10px',
          fontFamily: 'Space Mono, monospace',
        },
        format: 'MMM dd HH:mm',
      },
      axisBorder: {
        color: '#e5e5e5',
      },
      axisTicks: {
        color: '#e5e5e5',
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: '#737373',
          fontSize: '10px',
          fontFamily: 'Space Mono, monospace',
        },
        formatter: (val: number) => `$${Math.round(val / 1000)}k`,
      },
    },
    legend: {
      show: false,
    },
    tooltip: {
      theme: 'light',
      style: {
        fontFamily: 'Space Mono, monospace',
        fontSize: '11px',
      },
      x: {
        format: 'MMM dd, yyyy HH:mm',
      },
      y: {
        formatter: (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    },
    theme: {
      mode: 'light' as const,
    },
  } as any // Type assertion to avoid TypeScript strict type checking
})

const formatPrice = (price: number): string => {
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
</script>

<style scoped>
/* Ensure chart container takes full height */
.apexcharts-canvas {
  height: 100% !important;
}
</style>

