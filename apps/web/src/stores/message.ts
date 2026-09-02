import { fetchMessageHistory } from '@/api/conversation'
import type { MessageDto } from '@baker-chat/contracts'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type MessageHistoryStatus = 'idle' | 'loading' | 'ready' | 'error'

export type ConversationMessageHistory = {
  messages: MessageDto[]
  status: MessageHistoryStatus
  errorMessage: string | null
  nextBefore: number | null
}

function createIdleMessageHistory(): ConversationMessageHistory {
  return {
    messages: [],
    status: 'idle',
    errorMessage: null,
    nextBefore: null,
  }
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage
}

export const useMessageStore = defineStore('message', () => {
  let nextLoadId = 0
  const latestLoadIds = new Map<number, number>()

  const histories = ref<Record<number, ConversationMessageHistory>>({})

  function getHistory(conversationId: number): ConversationMessageHistory {
    return histories.value[conversationId] ?? createIdleMessageHistory()
  }

  async function loadFirstPage(conversationId: number): Promise<void> {
    const currentHistory = getHistory(conversationId)

    if (currentHistory.status === 'loading' || currentHistory.status === 'ready') {
      return
    }

    const loadId = ++nextLoadId
    latestLoadIds.set(conversationId, loadId)

    histories.value[conversationId] = {
      ...currentHistory,
      status: 'loading',
      errorMessage: null,
    }

    try {
      const historyPage = await fetchMessageHistory(conversationId)

      if (latestLoadIds.get(conversationId) !== loadId) {
        return
      }

      histories.value[conversationId] = {
        messages: historyPage.messages,
        status: 'ready',
        errorMessage: null,
        nextBefore: historyPage.nextBefore,
      }

      latestLoadIds.delete(conversationId)
    } catch (error) {
      if (latestLoadIds.get(conversationId) !== loadId) {
        return
      }

      histories.value[conversationId] = {
        ...currentHistory,
        status: 'error',
        errorMessage: getErrorMessage(error, '加载历史消息失败'),
      }

      latestLoadIds.delete(conversationId)
    }
  }

  function reset(): void {
    latestLoadIds.clear()
    histories.value = {}
  }

  return {
    histories,
    getHistory,
    loadFirstPage,
    reset,
  }
})
