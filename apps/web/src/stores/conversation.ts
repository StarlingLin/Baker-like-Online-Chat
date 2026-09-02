import { fetchConversations } from '@/api/conversation'
import type { ConversationSummaryDto } from '@baker-chat/contracts'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ConversationListStatus = 'idle' | 'loading' | 'ready' | 'error'

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage
}

export const useConversationStore = defineStore('conversation', () => {
  let latestLoadId = 0

  const conversations = ref<ConversationSummaryDto[]>([])
  const status = ref<ConversationListStatus>('idle')
  const errorMessage = ref<string | null>(null)
  const selectedConversationId = ref<number | null>(null)

  const selectedConversation = computed<ConversationSummaryDto | null>(() => {
    return (
      conversations.value.find(
        (conversation) => conversation.id === selectedConversationId.value,
      ) ?? null
    )
  })

  async function load(): Promise<void> {
    if (status.value === 'loading') {
      return
    }

    const loadId = ++latestLoadId

    status.value = 'loading'
    errorMessage.value = null

    try {
      const loadedConversations = await fetchConversations()

      if (loadId !== latestLoadId) {
        return
      }

      const previousSelectedId = selectedConversationId.value

      conversations.value = loadedConversations

      const previousSelectionStillExists =
        previousSelectedId !== null &&
        loadedConversations.some((conversation) => conversation.id === previousSelectedId)

      selectedConversationId.value = previousSelectionStillExists
        ? previousSelectedId
        : (loadedConversations[0]?.id ?? null)

      status.value = 'ready'
    } catch (error) {
      if (loadId !== latestLoadId) {
        return
      }

      conversations.value = []
      selectedConversationId.value = null
      errorMessage.value = getErrorMessage(error, '加载通讯列表失败')
      status.value = 'error'
    }
  }

  function selectConversation(conversationId: number): void {
    const conversationExists = conversations.value.some(
      (conversation) => conversation.id === conversationId,
    )

    if (!conversationExists) {
      return
    }

    selectedConversationId.value = conversationId
  }

  function reset(): void {
    latestLoadId += 1

    conversations.value = []
    status.value = 'idle'
    errorMessage.value = null
    selectedConversationId.value = null
  }

  return {
    conversations,
    status,
    errorMessage,
    selectedConversationId,
    selectedConversation,
    load,
    selectConversation,
    reset,
  }
})
