import cookie from '@fastify/cookie'
import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'

import type { AppEnvironment } from './config.js'
import { createDatabaseClient } from './db/client.js'

export type BuildAppOptions = {
  appEnvironment: AppEnvironment
  databaseUrl: string
  serverOptions?: FastifyServerOptions
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify(options.serverOptions)
  app.register(cookie)

  const database = createDatabaseClient({
    databaseUrl: options.databaseUrl,
    onPoolError(error) {
      app.log.error({ err: error }, '数据库连接池错误')
    },
  })

  app.addHook('onClose', async () => {
    await database.close()
  })

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
