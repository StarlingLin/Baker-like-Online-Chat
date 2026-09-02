import {
  MESSAGE_CREATED_EVENT,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@baker-chat/contracts'
import { defineStore } from 'pinia'
import { io, type Socket } from 'socket.io-client'
import { ref } from 'vue'

import { useMessageStore } from '@/stores/message'

export type RealtimeStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'

type RealtimeSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export const useRealtimeStore = defineStore('realtime', () => {
  const messageStore = useMessageStore()

  let socket: RealtimeSocket | null = null
  let hasConnected = false

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
    socket?.disconnect()
    hasConnected = false
    resetState()
  }

  return {
    status,
    errorMessage,
    reconnectAttempt,
    connect,
    disconnect,
  }
})
