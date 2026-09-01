import {
  MESSAGE_CREATED_EVENT,
  SEND_MESSAGE_EVENT,
  sendMessagePayloadSchema,
  type ClientToServerEvents,
  type MessageDto,
  type ServerToClientEvents,
} from '@baker-chat/contracts'
import type { FastifyInstance } from 'fastify'
import { Server, type DefaultEventsMap } from 'socket.io'

import type { ConversationMessage, ConversationService } from '../conversation/service.js'
import { SESSION_COOKIE_NAME } from '../session/cookie.js'
import type { SessionService, SessionUser } from '../session/service.js'

export type RealtimeSocketData = {
  user: SessionUser
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

function createMessageDto(message: ConversationMessage): MessageDto {
  return {
    id: message.id,
    clientMessageId: message.clientMessageId,
    sender: message.sender,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }
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

  io.on('connection', async (socket) => {
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

    const conversationRoomNames = socket.data.conversationIds.map(createConversationRoomName)

    if (conversationRoomNames.length === 0) {
      return
    }

    try {
      await socket.join(conversationRoomNames)
    } catch (error) {
      app.log.error(
        {
          err: error,
          userUid: socket.data.user.uid,
          conversationIds: socket.data.conversationIds,
        },
        'Socket.IO 加入会话房间失败',
      )

      socket.disconnect(true)
    }
  })

  app.addHook('preClose', async () => {
    io.local.disconnectSockets(true)
  })

  return io
}
