import {
  MESSAGE_CREATED_EVENT,
  SEND_MESSAGE_EVENT,
  messageContentSchema,
  type ClientToServerEvents,
  type SendMessageAcknowledgement,
  type SendMessagePayload,
  type ServerToClientEvents,
} from '@baker-chat/contracts'
import { defineStore } from 'pinia'
import { io, type Socket } from 'socket.io-client'
import { ref } from 'vue'

import { useMessageStore } from '@/stores/message'
import { useSessionStore } from '@/stores/session'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'
// 收到回执 | 没连接 | 没确认可能超时 | 不属于当前登录周期
export type RealtimeSendResult =
  | {
      status: 'acknowledged'
      acknowledgement: SendMessageAcknowledgement
    }
  | { status: 'not_connected' }
  | { status: 'unconfirmed' }
  | { status: 'cancelled' }
export type SubmitMessageResult =
  { ok: true; clientMessageId: string } | { ok: false; errorMessage: string }

type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export const useRealtimeStore = defineStore('realtime', () => {
  const messageStore = useMessageStore()
  const sessionStore = useSessionStore()

  let socket: RealtimeSocket | null = null
  let hasConnected = false
  let connectionGeneration = 0
  let nextSendAttemptId = 0
  const latestSendAttempts = new Map<string, number>()

  const status = ref<RealtimeStatus>('idle')
  const errorMessage = ref<string | null>(null)
  const reconnectAttempt = ref(0)

  function resetState(): void {
    status.value = 'idle'
    errorMessage.value = null
    reconnectAttempt.value = 0
  }

  function registerSocketListeners(createdSocket: RealtimeSocket): void {
    createdSocket.on('connect', () => {
      const shouldRefreshMessages = hasConnected

      hasConnected = true
      status.value = 'connected'
      errorMessage.value = null
      reconnectAttempt.value = 0

      if (shouldRefreshMessages) {
        void messageStore.refreshReadyHistories()
      }
    })

    createdSocket.on(MESSAGE_CREATED_EVENT, ({ conversationId, message }) => {
      messageStore.mergeIncomingMessage(conversationId, message)
    })

    createdSocket.on('connect_error', (error) => {
      status.value = createdSocket.active ? 'reconnecting' : 'error'
      errorMessage.value =
        error.message.length > 0 ? `实时连接失败：${error.message}` : '实时连接失败'
    })

    createdSocket.on('disconnect', (reason) => {
      if (reason === 'io client disconnect') {
        return
      }

      status.value = createdSocket.active ? 'reconnecting' : 'error'
      errorMessage.value = `实时连接已断开：${reason}`
    })

    createdSocket.io.on('reconnect_attempt', (attempt) => {
      status.value = 'reconnecting'
      errorMessage.value = null
      reconnectAttempt.value = attempt
    })

    createdSocket.io.on('reconnect_failed', () => {
      status.value = 'error'
      errorMessage.value = '实时连接重试已停止'
    })
  }

  function getOrCreateSocket(): RealtimeSocket {
    if (socket !== null) {
      return socket
    }

    const createdSocket: RealtimeSocket = io({
      autoConnect: false,
      withCredentials: true,
    })

    registerSocketListeners(createdSocket)
    socket = createdSocket

    return createdSocket
  }

  function connect(): void {
    const socketClient = getOrCreateSocket()

    if (socketClient.connected || socketClient.active) {
      return
    }

    status.value = 'connecting'
    errorMessage.value = null
    reconnectAttempt.value = 0

    socketClient.connect()
  }

  function disconnect(): void {
    connectionGeneration += 1
    latestSendAttempts.clear()
    socket?.disconnect()
    hasConnected = false
    resetState()
  }

  async function sendMessage(payload: SendMessagePayload): Promise<RealtimeSendResult> {
    const socketClient = socket

    if (socketClient === null || !socketClient.connected) {
      return { status: 'not_connected' }
    }
    const generation = connectionGeneration

    const result = await new Promise<RealtimeSendResult>((resolve) => {
      socketClient
        .timeout(10_000)
        .emit(
          SEND_MESSAGE_EVENT,
          payload,
          (error: Error | null, acknowledgement: SendMessageAcknowledgement | undefined) => {
            if (error !== null || acknowledgement === undefined) {
              resolve({ status: 'unconfirmed' })
              return
            }

            resolve({
              status: 'acknowledged',
              acknowledgement,
            })
          },
        )
    })

    if (generation !== connectionGeneration) {
      return { status: 'cancelled' }
    }

    return result
  }

  async function sendOutgoingMessage(
    conversationId: number,
    clientMessageId: string,
  ): Promise<void> {
    const user = sessionStore.user

    if (
      sessionStore.status !== 'authenticated' ||
      user === null ||
      sessionStore.signOutStatus === 'loading' ||
      socket === null ||
      !socket.connected ||
      messageStore.getHistory(conversationId).status !== 'ready'
    ) {
      return
    }

    const outgoingMessage = messageStore
      .getOutgoingMessages(conversationId)
      .find(
        (message) =>
          message.sender.uid === user.uid && message.payload.clientMessageId === clientMessageId,
      )

    if (outgoingMessage === undefined) {
      return
    }

    const key = `${conversationId}:${user.uid}:${clientMessageId}`

    if (latestSendAttempts.has(key)) {
      return
    }

    const attemptId = ++nextSendAttemptId
    const generation = connectionGeneration

    latestSendAttempts.set(key, attemptId)
    messageStore.setOutgoingMessageState(conversationId, user.uid, clientMessageId, {
      status: 'sending',
    })

    try {
      const result = await sendMessage(outgoingMessage.payload)

      if (
        generation !== connectionGeneration ||
        latestSendAttempts.get(key) !== attemptId ||
        sessionStore.status !== 'authenticated' ||
        sessionStore.user?.uid !== user.uid ||
        !messageStore.getOutgoingMessages(conversationId).includes(outgoingMessage) ||
        result.status === 'cancelled'
      ) {
        return
      }

      if (result.status === 'acknowledged') {
        const acknowledgement = result.acknowledgement

        if (acknowledgement.ok) {
          messageStore.mergeIncomingMessage(conversationId, acknowledgement.message)
        } else {
          messageStore.setOutgoingMessageState(conversationId, user.uid, clientMessageId, {
            status: 'failed',
            error: acknowledgement.error,
          })
        }

        return
      }

      messageStore.setOutgoingMessageState(conversationId, user.uid, clientMessageId, {
        status: 'unconfirmed',
      })
    } finally {
      if (latestSendAttempts.get(key) === attemptId) {
        latestSendAttempts.delete(key)
      }
    }
  }

  function submitMessage(conversationId: number, content: string): SubmitMessageResult {
    const user = sessionStore.user

    if (
      sessionStore.status !== 'authenticated' ||
      user === null ||
      sessionStore.signOutStatus === 'loading'
    ) {
      return { ok: false, errorMessage: '连接协议后方可接入通讯' }
    }

    if (socket === null || !socket.connected) {
      return { ok: false, errorMessage: '连接已断开，请恢复后重试' }
    }

    if (messageStore.getHistory(conversationId).status !== 'ready') {
      return { ok: false, errorMessage: '请等待当前会话的历史消息加载完成' }
    }

    const parsedContent = messageContentSchema.safeParse(content)

    if (!parsedContent.success) {
      return {
        ok: false,
        errorMessage: parsedContent.error.issues[0]?.message ?? '消息内容不符合要求',
      }
    }

    const payload: SendMessagePayload = {
      conversationId,
      clientMessageId: crypto.randomUUID(),
      content: parsedContent.data,
    }
    const generation = connectionGeneration

    messageStore.addOutgoingMessage(payload, user)

    void sendOutgoingMessage(conversationId, payload.clientMessageId).catch(() => {
      if (
        generation !== connectionGeneration ||
        sessionStore.status !== 'authenticated' ||
        sessionStore.user?.uid !== user.uid
      ) {
        return
      }

      messageStore.setOutgoingMessageState(conversationId, user.uid, payload.clientMessageId, {
        status: 'unconfirmed',
      })
    })

    return { ok: true, clientMessageId: payload.clientMessageId }
  }

  return {
    status,
    errorMessage,
    reconnectAttempt,
    connect,
    disconnect,
    sendMessage,
    sendOutgoingMessage,
    submitMessage,
  }
})
