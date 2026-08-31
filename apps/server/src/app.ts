import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify'

export function buildApp(options: FastifyServerOptions = {}): FastifyInstance {
  const app = Fastify(options)

  app.get('/api/health', async () => {
    return { status: 'ok' }
  })

  return app
}
