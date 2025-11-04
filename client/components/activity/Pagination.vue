<template>
  <div
    v-if="pagination && pagination.totalPages > 1"
    class="border-t border-mono-border p-3 flex items-center bg-mono-bg justify-center"
  >
    <div class="flex items-center gap-2">
      <button
        @click="handlePageChange(pagination.page - 1)"
        :disabled="pagination.page <= 1 || pending"
        :class="[
          'px-3 py-1 text-xs border rounded-sm transition-colors',
          pagination.page <= 1 || pending
            ? 'border-mono-border text-mono-text-secondary cursor-not-allowed opacity-50'
            : 'border-mono-border text-mono-text-primary hover:bg-mono-hover cursor-pointer'
        ]"
      >
        Prev
      </button>
      <div class="text-xs text-secondary">
        Page {{ pagination.page }} of {{ pagination.totalPages }}
      </div>
      <button
        @click="handlePageChange(pagination.page + 1)"
        :disabled="pagination.page >= pagination.totalPages || pending"
        :class="[
          'px-3 py-1 text-xs border rounded-sm transition-colors',
          pagination.page >= pagination.totalPages || pending
            ? 'border-mono-border text-mono-text-secondary cursor-not-allowed opacity-50'
            : 'border-mono-border text-mono-text-primary hover:bg-mono-hover cursor-pointer'
        ]"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface Props {
  pagination: PaginationInfo | null
  pending?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pending: false,
})

const emit = defineEmits<{
  'page-change': [page: number]
}>()

const handlePageChange = (page: number) => {
  if (page >= 1 && props.pagination && page <= props.pagination.totalPages) {
    emit('page-change', page)
  }
}
</script>

