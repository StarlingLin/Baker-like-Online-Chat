import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'

import type { AppEnvironment } from './config.js'
import { createConversationService } from './conversation/service.js'
import { createDatabaseClient } from './db/client.js'
import { attachRealtimeServer, createSessionRoomName } from './realtime/server.js'
import { conversationRoutes } from './routes/conversation.js'
import { developmentSessionRoutes } from './routes/development-session.js'
import { sessionRoutes } from './routes/session.js'
import { createSessionService } from './session/service.js'

export type BuildAppOptions = {
  appEnvironment: AppEnvironment
  databaseUrl: string
  serverOptions?: FastifyServerOptions
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    ...options.serverOptions,
    ajv: {
      customOptions: {
        coerceTypes: false,
        removeAdditional: false,
      },
    },
  })
  app.register(cookie)

  const database = createDatabaseClient({
    databaseUrl: options.databaseUrl,
    onPoolError(error) {
      app.log.error({ err: error }, '数据库连接池错误')
    },
  })

  const sessionService = createSessionService(database.db)
  const conversationService = createConversationService(database.db)
  const io = attachRealtimeServer(app, {
    conversationService,
    sessionService,
  })

  app.addHook('onClose', async () => {
    await database.close()
  })

  app.register(sessionRoutes, {
    appEnvironment: options.appEnvironment,
    sessionService,
    onSessionRevoked(tokenHash) {
      io.in(createSessionRoomName(tokenHash)).disconnectSockets(true)
    },
  })

  app.register(conversationRoutes, {
    appEnvironment: options.appEnvironment,
    sessionService,
    conversationService,
  })

  if (options.appEnvironment === 'development') {
    app.register(developmentSessionRoutes, {
      database: database.db,
      sessionService,
    })
  }

  app.get('/api/health', async () => {
    return { status: 'ok' }
  })

  app.get('/api/ready', async (_request, reply) => {
    try {
      await database.checkConnection()

      return { status: 'ready' }
    } catch (error) {
      app.log.error({ err: error }, '数据库未就绪')

      return reply.status(503).send({
        status: 'unavailable',
      })
    }
  })

  return app
}
