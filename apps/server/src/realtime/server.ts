import type { FastifyInstance } from 'fastify'
import { Server, type DefaultEventsMap } from 'socket.io'

import type { ConversationService } from '../conversation/service.js'
import { SESSION_COOKIE_NAME } from '../session/cookie.js'
import type { SessionService, SessionUser } from '../session/service.js'

export type RealtimeSocketData = {
  user: SessionUser
  conversationIds: number[]
}

export type RealtimeServer = Server<
  DefaultEventsMap,
  DefaultEventsMap,
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

export function attachRealtimeServer(
  app: FastifyInstance,
  options: AttachRealtimeServerOptions,
): RealtimeServer {
  const io = new Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, RealtimeSocketData>(
    app.server,
    {
      serveClient: false,
    },
  )

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
