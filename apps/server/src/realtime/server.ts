import type { FastifyInstance } from 'fastify'
import { Server, type DefaultEventsMap } from 'socket.io'

import { SESSION_COOKIE_NAME } from '../session/cookie.js'
import type { SessionService, SessionUser } from '../session/service.js'

export type RealtimeSocketData = {
  user: SessionUser
}

export type RealtimeServer = Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  RealtimeSocketData
>

export type AttachRealtimeServerOptions = {
  sessionService: SessionService
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
      next()
    } catch (error) {
      app.log.error({ err: error }, 'Socket.IO 握手认证发生内部错误')
      next(new Error('internal_error'))
    }
  })

  app.addHook('preClose', async () => {
    io.local.disconnectSockets(true)
  })

  return io
}
