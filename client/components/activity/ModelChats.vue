<template>
  <div class="flex flex-col h-full">
    <div class="flex-1 overflow-y-auto p-4 space-y-4">
      <ModelChatMessageCard
        v-for="message in modelChatMessages"
        :key="message.id"
        :message="message"
        :model-color="getModelColor(message.account_id)"
      />
      <div v-if="modelChatMessages.length === 0 && !pending" class="text-center text-secondary text-xs py-8">
        No messages yet
      </div>
      <div v-if="pending" class="text-center text-secondary text-xs py-8">
        Loading...
      </div>
    </div>
    
    <!-- Pagination Controls -->
    <Pagination
      :pagination="pagination"
      :pending="pending"
      @page-change="goToPage"
    />
  </div>
</template>

<script setup lang="ts">
import type { Model } from '~/types'
import ModelChatMessageCard from '~/components/activity/partials/MessageCard.vue'
import Pagination from '~/components/activity/Pagination.vue'

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

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ModelChatResponse {
  data: ModelChatMessage[]
  pagination: PaginationInfo
}

interface Props {
  models: Model[]
}

const props = defineProps<Props>()

// Pagination state
const currentPage = ref(1)
const pageSize = 10

// Fetch model chat messages with pagination
const { data: modelChatData, pending } = useFetch<ModelChatResponse>(
  () => `/api/model-chat?page=${currentPage.value}&limit=${pageSize}`
)

const modelChatMessages = computed(() => {
  if (!modelChatData.value) return []
  if ('data' in modelChatData.value) {
    return modelChatData.value.data
  }
  // Fallback for old API format
  return Array.isArray(modelChatData.value) ? modelChatData.value : []
})

const pagination = computed<PaginationInfo | null>(() => {
  if (!modelChatData.value) return null
  if ('pagination' in modelChatData.value) {
    return modelChatData.value.pagination
  }
  return null
})

const goToPage = (page: number) => {
  if (page >= 1 && pagination.value && page <= pagination.value.totalPages) {
    currentPage.value = page
  }
}

const getModelColor = (accountId: string): string => {
  const model = props.models.find(m => m.id === accountId)
  return model?.color || '#737373'
}
</script>
