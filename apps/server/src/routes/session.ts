import type { GetSessionResponse } from '@baker-chat/contracts'
import type { FastifyPluginAsync } from 'fastify'

import {
  authenticateSessionRequest,
  type SessionAuthenticationOptions,
} from '../session/authenticate-request.js'
import { createSessionCookieRemovalOptions, SESSION_COOKIE_NAME } from '../session/cookie.js'
import { hashSessionToken } from '../session/token.js'

export type SessionRoutesOptions = SessionAuthenticationOptions & {
  onSessionRevoked: (tokenHash: string) => void | Promise<void>
}

export const sessionRoutes: FastifyPluginAsync<SessionRoutesOptions> = async (app, options) => {
  app.get('/api/session', async (request, reply) => {
    const user = await authenticateSessionRequest(request, reply, options)

    if (!user) {
      return reply
    }

    return {
      user,
    } satisfies GetSessionResponse
  })

  app.delete('/api/session', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE_NAME]

    if (token) {
      await options.sessionService.deleteByToken(token)
      await options.onSessionRevoked(hashSessionToken(token))
    }

    return reply
      .clearCookie(SESSION_COOKIE_NAME, createSessionCookieRemovalOptions(options.appEnvironment))
      .status(204)
      .send()
  })
}
