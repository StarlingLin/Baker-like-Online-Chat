import { fetchMessageHistory } from '@/api/conversation'
import type {
  MessageDto,
  MessageSenderDto,
  SendMessageErrorCode,
  SendMessagePayload,
} from '@baker-chat/contracts'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export type MessageHistoryStatus = 'idle' | 'loading' | 'ready' | 'error'
export type OlderMessagesStatus = 'idle' | 'loading' | 'error'
export type OutgoingMessageState =
  | { status: 'sending' }
  | { status: 'unconfirmed' }
  | { status: 'failed'; error: SendMessageErrorCode }
export type OutgoingMessage = {
  payload: Readonly<SendMessagePayload>
  sender: MessageSenderDto
  submittedAt: string
  state: OutgoingMessageState
}

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

function mergeMessagesById(
  currentMessages: MessageDto[],
  incomingMessages: MessageDto[],
): MessageDto[] {
  const messagesById = new Map<number, MessageDto>()

  for (const message of currentMessages) {
    messagesById.set(message.id, message)
  }

  for (const message of incomingMessages) {
    messagesById.set(message.id, message)
  }

  return [...messagesById.values()].sort(
    (leftMessage, rightMessage) => leftMessage.id - rightMessage.id,
  )
}

export const useMessageStore = defineStore('message', () => {
  let nextLoadId = 0
  const latestLoadIds = new Map<number, number>()
  const latestOlderLoadIds = new Map<number, number>()
  const latestRefreshIds = new Map<number, number>()

  const histories = ref<Record<number, ConversationMessageHistory>>({})
  const outgoingMessages = ref<Record<number, OutgoingMessage[]>>({})

  function getHistory(conversationId: number): ConversationMessageHistory {
    return histories.value[conversationId] ?? createIdleMessageHistory()
  }

  function getOutgoingMessages(conversationId: number): OutgoingMessage[] {
    return outgoingMessages.value[conversationId] ?? []
  }

  function addOutgoingMessage(
    payload: SendMessagePayload,
    sender: MessageSenderDto,
  ): OutgoingMessage {
    const currentMessages = getOutgoingMessages(payload.conversationId)

    const existingMessage = currentMessages.find(
      (message) =>
        message.sender.uid === sender.uid &&
        message.payload.clientMessageId === payload.clientMessageId,
    )

    if (existingMessage !== undefined) {
      return existingMessage
    }

    const outgoingMessage: OutgoingMessage = {
      payload: { ...payload },
      sender: { ...sender },
      submittedAt: new Date().toISOString(),
      state: { status: 'sending' },
    }

    outgoingMessages.value[payload.conversationId] = [...currentMessages, outgoingMessage]

    return outgoingMessage
  }

  function setOutgoingMessageState(
    conversationId: number,
    senderUid: number,
    clientMessageId: string,
    state: OutgoingMessageState,
  ): boolean {
    const outgoingMessage = getOutgoingMessages(conversationId).find(
      (message) =>
        message.sender.uid === senderUid && message.payload.clientMessageId === clientMessageId,
    )

    if (outgoingMessage === undefined) {
      return false
    }

    outgoingMessage.state = { ...state }
    return true
  }

  function reconcileOutgoingMessages(
    conversationId: number,
    confirmedMessages: MessageDto[],
  ): void {
    const currentMessages = getOutgoingMessages(conversationId)

    if (currentMessages.length === 0) {
      return
    }

    outgoingMessages.value[conversationId] = currentMessages.filter(
      (outgoingMessage) =>
        !confirmedMessages.some(
          (confirmedMessage) =>
            confirmedMessage.sender.uid === outgoingMessage.sender.uid &&
            confirmedMessage.clientMessageId === outgoingMessage.payload.clientMessageId,
        ),
    )
  }

  function mergeIncomingMessage(conversationId: number, message: MessageDto): void {
    const currentHistory = getHistory(conversationId)

    histories.value[conversationId] = {
      ...currentHistory,
      messages: mergeMessagesById(currentHistory.messages, [message]),
    }

    reconcileOutgoingMessages(conversationId, [message])
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

      const latestHistory = histories.value[conversationId]

      if (latestHistory === undefined || latestHistory.status !== 'loading') {
        latestLoadIds.delete(conversationId)
        return
      }

      histories.value[conversationId] = {
        messages: mergeMessagesById(historyPage.messages, latestHistory.messages),
        status: 'ready',
        errorMessage: null,
        nextBefore: historyPage.nextBefore,
        olderMessagesStatus: 'idle',
        olderMessagesErrorMessage: null,
      }

      reconcileOutgoingMessages(conversationId, historyPage.messages)

      latestLoadIds.delete(conversationId)
    } catch (error) {
      if (latestLoadIds.get(conversationId) !== loadId) {
        return
      }

      const latestHistory = histories.value[conversationId]

      if (latestHistory === undefined || latestHistory.status !== 'loading') {
        latestLoadIds.delete(conversationId)
        return
      }

      histories.value[conversationId] = {
        ...latestHistory,
        status: 'error',
        errorMessage: getErrorMessage(error, '加载历史消息失败'),
      }

      latestLoadIds.delete(conversationId)
    }
  }

  async function refreshLatestMessages(conversationId: number): Promise<void> {
    const currentHistory = getHistory(conversationId)

    if (currentHistory.status !== 'ready' || latestRefreshIds.has(conversationId)) {
      return
    }

    const refreshId = ++nextLoadId

    latestRefreshIds.set(conversationId, refreshId)

    try {
      const historyPage = await fetchMessageHistory(conversationId)

      if (latestRefreshIds.get(conversationId) !== refreshId) {
        return
      }

      const latestHistory = histories.value[conversationId]

      if (latestHistory === undefined || latestHistory.status !== 'ready') {
        latestRefreshIds.delete(conversationId)
        return
      }

      histories.value[conversationId] = {
        ...latestHistory,
        messages: mergeMessagesById(latestHistory.messages, historyPage.messages),
      }

      reconcileOutgoingMessages(conversationId, historyPage.messages)

      latestRefreshIds.delete(conversationId)
    } catch {
      if (latestRefreshIds.get(conversationId) === refreshId) {
        latestRefreshIds.delete(conversationId)
      }
    }
  }

  async function refreshReadyHistories(): Promise<void> {
    const readyConversationIds = Object.entries(histories.value)
      .filter(([, history]) => history.status === 'ready')
      .map(([conversationId]) => Number(conversationId))

    await Promise.all(
      readyConversationIds.map((conversationId) => refreshLatestMessages(conversationId)),
    )
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

      reconcileOutgoingMessages(conversationId, historyPage.messages)

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
    latestRefreshIds.clear()
    histories.value = {}
    outgoingMessages.value = {}
  }

  return {
    histories,
    getHistory,
    mergeIncomingMessage,
    loadFirstPage,
    refreshLatestMessages,
    refreshReadyHistories,
    loadOlderMessages,
    outgoingMessages,
    getOutgoingMessages,
    addOutgoingMessage,
    setOutgoingMessageState,
    reset,
  }
})
