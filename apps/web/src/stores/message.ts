import { fetchMessageHistory } from '@/api/conversation'
import type { MessageDto } from '@baker-chat/contracts'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type MessageHistoryStatus = 'idle' | 'loading' | 'ready' | 'error'
export type OlderMessagesStatus = 'idle' | 'loading' | 'error'

export type ConversationMessageHistory = {
  messages: MessageDto[]
  status: MessageHistoryStatus
  errorMessage: string | null
  nextBefore: number | null
  olderMessagesStatus: OlderMessagesStatus
  olderMessagesErrorMessage: string | null
}

function createIdleMessageHistory(): ConversationMessageHistory {
  return {
    messages: [],
    status: 'idle',
    errorMessage: null,
    nextBefore: null,
    olderMessagesStatus: 'idle',
    olderMessagesErrorMessage: null,
  }
}

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage
}

export const useMessageStore = defineStore('message', () => {
  let nextLoadId = 0
  const latestLoadIds = new Map<number, number>()
  const latestOlderLoadIds = new Map<number, number>()

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
        olderMessagesStatus: 'idle',
        olderMessagesErrorMessage: null,
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

  async function loadOlderMessages(conversationId: number): Promise<void> {
    const currentHistory = getHistory(conversationId)

    if (
      currentHistory.status !== 'ready' ||
      currentHistory.nextBefore === null ||
      currentHistory.olderMessagesStatus === 'loading'
    ) {
      return
    }

    const beforeMessageId = currentHistory.nextBefore
    const loadId = ++nextLoadId

    latestOlderLoadIds.set(conversationId, loadId)

    histories.value[conversationId] = {
      ...currentHistory,
      olderMessagesStatus: 'loading',
      olderMessagesErrorMessage: null,
    }

    try {
      const historyPage = await fetchMessageHistory(conversationId, beforeMessageId)

      if (latestOlderLoadIds.get(conversationId) !== loadId) {
        return
      }

      const latestHistory = histories.value[conversationId]

      if (latestHistory === undefined || latestHistory.status !== 'ready') {
        latestOlderLoadIds.delete(conversationId)
        return
      }

      const existingMessageIds = new Set(latestHistory.messages.map((message) => message.id))

      const uniqueOlderMessages = historyPage.messages.filter((message) => {
        if (existingMessageIds.has(message.id)) {
          return false
        }

        existingMessageIds.add(message.id)
        return true
      })

      histories.value[conversationId] = {
        ...latestHistory,
        messages: [...uniqueOlderMessages, ...latestHistory.messages],
        nextBefore: historyPage.nextBefore,
        olderMessagesStatus: 'idle',
        olderMessagesErrorMessage: null,
      }

      latestOlderLoadIds.delete(conversationId)
    } catch (error) {
      if (latestOlderLoadIds.get(conversationId) !== loadId) {
        return
      }

      const latestHistory = histories.value[conversationId]

      if (latestHistory === undefined || latestHistory.status !== 'ready') {
        latestOlderLoadIds.delete(conversationId)
        return
      }

      histories.value[conversationId] = {
        ...latestHistory,
        olderMessagesStatus: 'error',
        olderMessagesErrorMessage: getErrorMessage(error, '加载更早消息失败'),
      }

      latestOlderLoadIds.delete(conversationId)
    }
  }

  function reset(): void {
    latestLoadIds.clear()
    latestOlderLoadIds.clear()
    histories.value = {}
  }

  return {
    histories,
    getHistory,
    loadFirstPage,
    loadOlderMessages,
    reset,
  }
})
