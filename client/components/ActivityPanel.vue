<template>
  <div class="h-full flex flex-col bg-mono-bg">
    <!-- Tabs -->
    <div class="flex">
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="[
          'w-full px-3 py-2 text-xs uppercase font-bold tracking-wider transition-colors relative border-b-2 border-l-2 border-mono-border',
          activeTab === tab ? 'tab-active' : 'tab-inactive'
        ]"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </div>

    <!-- Tab Content -->
    <div class="flex-1 overflow-y-auto border-l-2 border-mono-border">
      <CompletedTradesTab v-if="activeTab === 'COMPLETED TRADES'" />
      <ModelChatTab v-else-if="activeTab === 'MODELCHAT'" :models="models" />
      <PositionsTab v-else-if="activeTab === 'POSITIONS'" :model-positions="modelPositions" :loading="loading" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModelPositions, Model } from '~/types'
import CompletedTradesTab from '~/components/activity/CompletedTrades.vue'
import ModelChatTab from '~/components/activity/ModelChats.vue'
import PositionsTab from '~/components/activity/Positions.vue'

interface Props {
  modelPositions: ModelPositions[]
  models: Model[]
  loading?: boolean
}

defineProps<Props>()

const tabs = ['COMPLETED TRADES', 'MODELCHAT', 'POSITIONS']
const activeTab = ref('COMPLETED TRADES')
</script>

<style scoped>
/* Scrollbar styling */
.overflow-y-auto::-webkit-scrollbar {
  width: 4px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #e5e5e5;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb {
  background: #3e3e3e;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #d4d4d4;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #4e4e4e;
}
</style>
