<template>
  <div class="p-4 space-y-6">
    <ModelPositionsCard
      v-for="modelData in modelPositions"
      :key="modelData.model.id"
      :model-positions="modelData"
    />
    <div v-if="modelPositions.length === 0" class="text-center text-secondary text-xs py-8">
      No open positions
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ModelPositions } from '~/types'
import ModelPositionsCard from '~/components/activity/partials/PositionsCard.vue'


interface Props {
  modelPositions: ModelPositions[]
}

defineProps<Props>()
</script>
