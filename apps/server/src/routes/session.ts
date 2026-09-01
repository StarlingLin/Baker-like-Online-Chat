import type { FastifyPluginAsync } from 'fastify'

import type { AppEnvironment } from '../config.js'
import { createSessionCookieRemovalOptions, SESSION_COOKIE_NAME } from '../session/cookie.js'
import type { SessionService } from '../session/service.js'

const UNAUTHENTICATED_RESPONSE = {
  error: 'unauthenticated',
} as const

export type SessionRoutesOptions = {
  appEnvironment: AppEnvironment
  sessionService: SessionService
}

export const sessionRoutes: FastifyPluginAsync<SessionRoutesOptions> = async (app, options) => {
  app.get('/api/session', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE_NAME]

    if (token === undefined) {
      return reply.status(401).send(UNAUTHENTICATED_RESPONSE)
    }

    if (token.length === 0) {
      return reply
        .clearCookie(SESSION_COOKIE_NAME, createSessionCookieRemovalOptions(options.appEnvironment))
        .status(401)
        .send(UNAUTHENTICATED_RESPONSE)
    }

    const user = await options.sessionService.findUserByToken(token)

    if (!user) {
      return reply
        .clearCookie(SESSION_COOKIE_NAME, createSessionCookieRemovalOptions(options.appEnvironment))
        .status(401)
        .send(UNAUTHENTICATED_RESPONSE)
    }

    return {
      user,
    }
  })

  app.delete('/api/session', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE_NAME]

    if (token) {
      await options.sessionService.deleteByToken(token)
    }

    return reply
      .clearCookie(SESSION_COOKIE_NAME, createSessionCookieRemovalOptions(options.appEnvironment))
      .status(204)
      .send()
  })
}
