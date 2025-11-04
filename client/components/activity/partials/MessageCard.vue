<template>
  <div
    class="border-2 rounded-sm p-4"
    :style="{ borderColor: modelColor }"
  >
    <div class="flex items-start space-x-3 mb-2">
      <div
        class="w-8 h-8 flex items-center justify-center rounded-sm flex-shrink-0 font-bold text-xs"
        :style="{ 
          backgroundColor: modelColor,
          color: '#fff'
        }"
      >
        {{ modelInitial }}
      </div>
      <div class="flex-1">
        <div class="flex items-center justify-between mb-1">
          <span class="font-bold text-xs text-primary uppercase">{{ message.model_name }}</span>
          <span class="text-xs text-secondary">{{ message.timestamp }}</span>
        </div>
        <div class="text-xs text-primary leading-relaxed">
          {{ truncatedMessage }}
        </div>
        <div class="text-right mt-2">
          <button
            @click="toggleExpansion"
            class="text-xs text-secondary hover:text-primary transition-colors uppercase tracking-wider"
          >
            {{ isExpanded ? 'click to collapse' : 'click to expand' }}
          </button>
        </div>
        <div
          v-if="isExpanded"
          class="mt-2 text-xs text-primary leading-relaxed whitespace-pre-wrap"
        >
          {{ message.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface ModelChatMessage {
  id: string
  account_id: string
  model_name: string
  message: string
  timestamp: string
  created_at: string
}

interface Props {
  message: ModelChatMessage
  modelColor: string
}

const props = defineProps<Props>()
const isExpanded = ref(false)

const modelInitial = computed(() => {
  const words = props.message.model_name.split(' ')
  if (words.length > 0) {
    return words[0].charAt(0).toUpperCase()
  }
  return props.message.model_name.charAt(0).toUpperCase()
})

const truncatedMessage = computed(() => {
  const maxLength = 200
  if (props.message.message.length <= maxLength) return props.message.message
  return props.message.message.substring(0, maxLength) + '...'
})

const toggleExpansion = () => {
  isExpanded.value = !isExpanded.value
}
</script>
