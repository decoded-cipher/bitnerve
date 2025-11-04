<template>
  <div>
    <div v-if="loading" class="text-center text-secondary text-xs py-8">
      Loading positions...
    </div>
    <template v-else>
      <ModelPositionsCard
        v-for="modelData in modelPositions"
        :key="modelData.model.id"
        :model-positions="modelData"
      />
      <div v-if="modelPositions.length === 0" class="text-center text-secondary text-xs py-8">
        No open positions
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ModelPositions } from '~/types'
import ModelPositionsCard from '~/components/activity/partials/PositionsCard.vue'


interface Props {
  modelPositions: ModelPositions[]
  loading?: boolean
}

defineProps<Props>()
</script>
