<template>
  <div class="h-full flex flex-col card-surface rounded-lg p-6">
    <h2 class="text-center text-xl font-bold mb-6 text-primary uppercase">
      TOTAL ACCOUNT VALUE
    </h2>
    
    <!-- Chart Container -->
    <div ref="chartContainer" class="flex-1 min-h-0" style="position: relative;">
      <apexchart
        v-if="containerHeight > 0"
        type="line"
        :height="containerHeight"
        :options="chartOptions"
        :series="chartSeries"
        class="w-full"
      />
    </div>

    <!-- Legend -->
    <div class="grid grid-cols-7 gap-4 mt-6 pt-6 border-t border-light-border dark:border-gray-800">
      <div
        v-for="model in modelsWithValues"
        :key="model.id"
        class="flex items-center space-x-2"
      >
        <div
          class="w-3 h-3 rounded-full flex-shrink-0"
          :style="{ backgroundColor: model.color }"
        ></div>
        <div class="text-xs min-w-0">
          <div class="font-semibold text-primary truncate">{{ model.name }}</div>
          <div class="text-secondary">{{ formatPrice(model.currentValue) }}</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="mt-4 text-xs text-secondary">
      <a href="https://nof1.ai" class="hover:opacity-80 transition-opacity">https://nof1.ai</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Model, AccountValue } from '~/types'
import { useTheme } from '~/composables/useTheme'

interface Props {
  models: Model[]
  accountValues: AccountValue[]
}

const props = defineProps<Props>()
const { isDark } = useTheme()
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

// Watch for theme changes to re-render chart
watch(() => isDark.value, () => {
  nextTick(() => {
    updateChartHeight()
  })
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
  const isDarkMode = isDark.value
  
  return {
    chart: {
      type: 'line',
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
        type: 'x',
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800,
      },
      background: 'transparent',
      fontFamily: 'Inter, system-ui, sans-serif',
    },
    stroke: {
      curve: 'smooth',
      width: 2,
    },
    colors: props.models.map(m => m.color),
    dataLabels: {
      enabled: false,
    },
    grid: {
      borderColor: isDarkMode ? '#333' : '#e5e7eb',
      strokeDashArray: 4,
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
          colors: isDarkMode ? '#9ca3af' : '#6b7280',
          fontSize: '11px',
        },
        format: 'MMM dd HH:mm',
      },
      axisBorder: {
        color: isDarkMode ? '#333' : '#e5e7eb',
      },
      axisTicks: {
        color: isDarkMode ? '#333' : '#e5e7eb',
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: isDarkMode ? '#9ca3af' : '#6b7280',
          fontSize: '11px',
        },
        formatter: (val: number) => `$${Math.round(val / 1000)}k`,
      },
    },
    legend: {
      show: false,
    },
    tooltip: {
      theme: isDarkMode ? 'dark' : 'light',
      x: {
        format: 'MMM dd, yyyy HH:mm',
      },
      y: {
        formatter: (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      },
    },
    theme: {
      mode: isDarkMode ? 'dark' : 'light',
    },
  }
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

