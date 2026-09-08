import {
  MESSAGE_CREATED_EVENT,
  SEND_MESSAGE_EVENT,
  sendMessagePayloadSchema,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@baker-chat/contracts'
import type { FastifyInstance } from 'fastify'
import { Server, type DefaultEventsMap } from 'socket.io'

import { createMessageDto } from '../conversation/message-dto.js'
import type { ConversationService } from '../conversation/service.js'
import { SESSION_COOKIE_NAME } from '../session/cookie.js'
import type { SessionService, SessionUser } from '../session/service.js'
import { hashSessionToken } from '../session/token.js'

export type RealtimeSocketData = {
  user: SessionUser
  sessionTokenHash: string
  conversationIds: number[]
}

export type RealtimeServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  RealtimeSocketData
>

export type AttachRealtimeServerOptions = {
  conversationService: ConversationService
  sessionService: SessionService
}

export function createConversationRoomName(conversationId: number): string {
  return `conversation:${conversationId}`
}

export function createSessionRoomName(tokenHash: string): string {
  return `session:${tokenHash}`
}

export function attachRealtimeServer(
  app: FastifyInstance,
  options: AttachRealtimeServerOptions,
): RealtimeServer {
  const io = new Server<
    ClientToServerEvents /* 客户->服务 */,
    ServerToClientEvents /* 服务->客户 */,
    DefaultEventsMap /* 服务端间 */,
    RealtimeSocketData
  >(app.server, {
    serveClient: false,
  })

  // session认证
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.request.headers.cookie
      const token =
        cookieHeader === undefined ? undefined : app.parseCookie(cookieHeader)[SESSION_COOKIE_NAME]

      if (token === undefined || token.length === 0) {
        next(new Error('unauthenticated'))
        return
      }

      const user = await options.sessionService.findUserByToken(token)

      if (user === null) {
        next(new Error('unauthenticated'))
        return
      }

      socket.data.user = user
      socket.data.sessionTokenHash = hashSessionToken(token)
      socket.data.conversationIds = []
      next()
    } catch (error) {
      app.log.error({ err: error }, 'Socket.IO 握手认证发生内部错误')
      next(new Error('internal_error'))
    }
  })
  // 成员会话查询
  io.use(async (socket, next) => {
    try {
      const userConversations = await options.conversationService.listForUser(socket.data.user.uid)

      socket.data.conversationIds = userConversations.map((conversation) => conversation.id)

      next()
    } catch (error) {
      app.log.error(
        {
          err: error,
          userUid: socket.data.user.uid,
        },
        'Socket.IO 会话成员查询发生内部错误',
      )

      next(new Error('internal_error'))
    }
  })

  io.on('connection', (socket) => {
    let sessionExpiresAt = 0

    async function prepareConnection(): Promise<boolean> {
      try {
        await socket.join(createSessionRoomName(socket.data.sessionTokenHash))

        if (!socket.connected) {
          return false
        }

        const session = await options.sessionService.findActiveByTokenHash(
          socket.data.sessionTokenHash,
        )

        if (session === null || !socket.connected) {
          socket.disconnect(true)
          return false
        }

        sessionExpiresAt = session.expiresAt.getTime()

        const remainingMs = sessionExpiresAt - Date.now()

        if (remainingMs <= 0) {
          socket.disconnect(true)
          return false
        }

        const expiryTimer = setTimeout(() => {
          socket.disconnect(true)
        }, remainingMs)

        expiryTimer.unref()

        socket.once('disconnect', () => {
          clearTimeout(expiryTimer)
        })

        const conversationRoomNames = socket.data.conversationIds.map(createConversationRoomName)

        await socket.join(conversationRoomNames)

        return socket.connected
      } catch (error) {
        app.log.error(
          {
            err: error,
            userUid: socket.data.user.uid,
          },
          'Socket.IO 连接准入检查失败',
        )

        socket.disconnect(true)
        return false
      }
    }

    const connectionReady = prepareConnection()

    socket.on(SEND_MESSAGE_EVENT, async (payload, acknowledge) => {
      if (typeof acknowledge !== 'function') {
        return
      }

      const parsedPayload = sendMessagePayloadSchema.safeParse(payload)

      if (!parsedPayload.success) {
        acknowledge({
          ok: false,
          error: 'invalid_payload',
        })
        return
      }

      try {
        if (!(await connectionReady) || !socket.connected) {
          return
        }
        if (sessionExpiresAt <= Date.now()) {
          socket.disconnect(true)
          return
        }
        const result = await options.conversationService.sendMessageForUser({
          ...parsedPayload.data,
          senderUid: socket.data.user.uid,
        })

        if (result.status === 'conversation_not_found') {
          acknowledge({
            ok: false,
            error: 'conversation_not_found',
          })
          return
        }

        if (result.status === 'client_message_conflict') {
          acknowledge({
            ok: false,
            error: 'client_message_conflict',
          })
          return
        }

        const message = createMessageDto(result.message)

        acknowledge({
          ok: true,
          message,
        })

        if (result.status === 'created') {
          socket
            .to(createConversationRoomName(parsedPayload.data.conversationId))
            .emit(MESSAGE_CREATED_EVENT, {
              conversationId: parsedPayload.data.conversationId,
              message,
            })
        }
      } catch (error) {
        app.log.error(
          {
            err: error,
            userUid: socket.data.user.uid,
            conversationId: parsedPayload.data.conversationId,
            clientMessageId: parsedPayload.data.clientMessageId,
          },
          'Socket.IO 发送消息发生内部错误',
        )

        acknowledge({
          ok: false,
          error: 'internal_error',
        })
      }
    })
  })

  app.addHook('preClose', async () => {
    io.local.disconnectSockets(true)
  })

  return io
}
