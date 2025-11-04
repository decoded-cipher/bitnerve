<template>
  <div
    class="border rounded-sm p-4 bg-mono-bg cursor-pointer transition-colors hover:bg-mono-hover relative pb-8"
    :style="{ borderColor: modelColor, borderWidth: '1px' }"
    @click="toggleExpansion"
  >
    <!-- Header: Model name -->
    <div class="flex items-center gap-2 mb-2">
      <img
        v-if="modelIcon"
        :src="modelIcon"
        :alt="message.model_name"
        class="w-6 h-6 object-contain rounded-full border border-gray-300 p-0.5"
        @error="handleImageError"
      />
      <span class="font-bold text-xs text-primary uppercase">{{ message.model_name }}</span>
    </div>

    <!-- Message preview -->
    <div 
      class="text-xs text-primary leading-relaxed mb-2 markdown-content"
      v-html="renderedTruncatedMessage"
    ></div>

    <!-- Date - absolute bottom left -->
    <div class="absolute bottom-2 left-4">
      <span class="text-[10px] text-mono-text-primary">
        {{ new Date(message.created_at).toLocaleString() }}
      </span>
    </div>

    <!-- Click to expand indicator - absolute bottom right -->
    <div class="absolute bottom-2 right-4">
      <span class="text-[9px] text-mono-text-secondary italic">
        {{ isExpanded ? 'Click to collapse ▲' : 'Click to expand ▼' }}
      </span>
    </div>

    <!-- Expanded sub-cards -->
    <div v-if="isExpanded" class="mt-4 space-y-2 pb-6">
      <!-- USER_PROMPT sub-card -->
      <div class="border-l-2 border-mono-border pl-2">
        <div 
          class="flex items-center gap-2 mb-1 cursor-pointer"
          @click.stop="subCardExpanded.userPrompt = !subCardExpanded.userPrompt"
        >
          <span class="text-xs text-secondary" :class="{ 'rotate-90': subCardExpanded.userPrompt }">▶</span>
          <span class="text-xs font-bold text-primary uppercase">USER_PROMPT</span>
        </div>
        <div
          v-if="subCardExpanded.userPrompt"
          class="text-xs text-primary leading-relaxed mt-1 ml-4 markdown-content"
          v-html="renderedUserPrompt"
        ></div>
      </div>

      <!-- CHAIN_OF_THOUGHT sub-card -->
      <div class="border-l-2 border-mono-border pl-2">
        <div 
          class="flex items-center gap-2 mb-1 cursor-pointer"
          @click.stop="subCardExpanded.chainOfThought = !subCardExpanded.chainOfThought"
        >
          <span class="text-xs text-secondary" :class="{ 'rotate-90': subCardExpanded.chainOfThought }">▶</span>
          <span class="text-xs font-bold text-primary uppercase">CHAIN_OF_THOUGHT</span>
        </div>
        <div
          v-if="subCardExpanded.chainOfThought"
          class="text-xs text-primary leading-relaxed mt-1 ml-4 markdown-content"
          v-html="renderedChainOfThought"
        ></div>
      </div>

      <!-- TRADING_DECISIONS sub-card -->
      <div class="border-l-2 border-mono-border pl-2">
        <div 
          class="flex items-center gap-2 mb-1 cursor-pointer"
          @click.stop="subCardExpanded.tradingDecisions = !subCardExpanded.tradingDecisions"
        >
          <span class="text-xs text-secondary" :class="{ 'rotate-90': subCardExpanded.tradingDecisions }">▶</span>
          <span class="text-xs font-bold text-primary uppercase">TRADING_DECISIONS</span>
        </div>
        <div
          v-if="subCardExpanded.tradingDecisions"
          class="text-xs text-primary leading-relaxed mt-1 ml-4"
        >
          <div v-if="!message.agent_response || (Array.isArray(message.agent_response) && message.agent_response.length === 0)" class="text-secondary">
            No trading decisions made
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="(decision, index) in formattedTradingDecisions"
              :key="index"
              class="p-2 bg-mono-surface rounded border border-mono-surface-hover"
            >
              <div class="font-bold mb-1">{{ decision.toolName }}</div>
              <div class="text-secondary text-[10.5px]">
                <div v-for="(value, key) in decision.args" :key="key" class="mb-1">
                  <span class="font-semibold">{{ key }}:</span> {{ value }}
                </div>
              </div>
              <div v-if="decision.result" class="mt-2 pt-2 border-t border-mono-border text-[10.5px]">
                <div class="font-semibold mb-1">Result:</div>
                <pre class="text-secondary whitespace-pre-wrap">{{ JSON.stringify(decision.result, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useMarkdown } from '~/composables/useMarkdown'
import { getModelIcon } from '~/config/assets'

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
  message: ModelChatMessage
  modelColor: string
}

interface TradingDecision {
  toolName: string
  args: Record<string, any>
  result?: any
}

const props = defineProps<Props>()
const isExpanded = ref(false)

const subCardExpanded = ref({
  userPrompt: false,
  chainOfThought: false,
  tradingDecisions: false,
})

const modelIcon = computed(() => getModelIcon(props.message.model_name))

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

const truncatedMessage = computed(() => {
  const maxLength = 200
  const messageText = props.message.chain_of_thought || props.message.message || 'No message available'
  if (messageText.length <= maxLength) return messageText
  return messageText.substring(0, maxLength) + '...'
})

// Markdown rendering
const renderedTruncatedMessage = computed(() => {
  return useMarkdown(truncatedMessage.value)
})

const renderedUserPrompt = computed(() => {
  const prompt = props.message.user_prompt || 'No user prompt available'
  return useMarkdown(prompt)
})

const renderedChainOfThought = computed(() => {
  const thought = props.message.chain_of_thought || 'No chain of thought available'
  return useMarkdown(thought)
})

const formattedTradingDecisions = computed<TradingDecision[]>(() => {
  if (!props.message.agent_response) return []
  
  if (Array.isArray(props.message.agent_response)) {
    return props.message.agent_response.map((item: any) => ({
      toolName: item.toolName || item.tool_name || 'Unknown',
      args: item.args || {},
      result: item.result || null,
    }))
  }
  
  // Handle single object case
  if (typeof props.message.agent_response === 'object') {
    return [{
      toolName: props.message.agent_response.toolName || props.message.agent_response.tool_name || 'Unknown',
      args: props.message.agent_response.args || {},
      result: props.message.agent_response.result || null,
    }]
  }
  
  return []
})

const toggleExpansion = () => {
  isExpanded.value = !isExpanded.value
}
</script>

<style scoped>
.rotate-90 {
  transform: rotate(90deg);
  display: inline-block;
}

/* Markdown content styling */
.markdown-content :deep(p) {
  margin-bottom: 0.5em;
}

.markdown-content :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  font-weight: bold;
  margin-top: 0.75em;
  margin-bottom: 0.5em;
}

.markdown-content :deep(h1) { font-size: 1.25em; }
.markdown-content :deep(h2) { font-size: 1.15em; }
.markdown-content :deep(h3) { font-size: 1.1em; }

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-left: 1.5em;
  margin-bottom: 0.5em;
}

.markdown-content :deep(li) {
  margin-bottom: 0.25em;
}

.markdown-content :deep(code) {
  background-color: var(--mono-surface);
  padding: 0.125em 0.25em;
  border-radius: 0.25em;
  font-family: monospace;
  font-size: 0.9em;
}

.markdown-content :deep(pre) {
  background-color: var(--mono-surface);
  padding: 0.5em;
  border-radius: 0.25em;
  overflow-x: auto;
  margin-bottom: 0.5em;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.markdown-content :deep(blockquote) {
  border-left: 2px solid var(--mono-border);
  padding-left: 1em;
  margin-left: 0;
  margin-bottom: 0.5em;
  color: var(--mono-text-secondary);
}

.markdown-content :deep(a) {
  color: var(--mono-text);
  text-decoration: underline;
}

.markdown-content :deep(strong) {
  font-weight: bold;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.5em;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid var(--mono-border);
  padding: 0.25em 0.5em;
  text-align: left;
}

.markdown-content :deep(th) {
  font-weight: bold;
  background-color: var(--mono-surface);
}
</style>

