<template>
  <div class="p-4 space-y-4">
    <ModelChatMessageCard
      v-for="message in modelChatMessages"
      :key="message.id"
      :message="message"
      :model-color="getModelColor(message.account_id)"
    />
    <div v-if="modelChatMessages.length === 0" class="text-center text-secondary text-xs py-8">
      No messages yet
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Model } from '~/types'
import ModelChatMessageCard from '~/components/activity/partials/MessageCard.vue'


interface ModelChatMessage {
  id: string
  account_id: string
  model_name: string
  message: string
  timestamp: string
  created_at: string
  user_prompt?: string
  chain_of_thought?: string
  agent_response?: any
}

interface Props {
  models: Model[]
}

const props = defineProps<Props>()

// Fetch model chat messages
const { data: modelChatData } = await useFetch<ModelChatMessage[]>('/api/model-chat')
const modelChatMessages = computed(() => Array.isArray(modelChatData.value) ? modelChatData.value : [])

const getModelColor = (accountId: string): string => {
  const model = props.models.find(m => m.id === accountId)
  return model?.color || '#737373'
}
</script>
