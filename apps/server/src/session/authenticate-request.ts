import type { FastifyReply, FastifyRequest } from 'fastify'

import type { AppEnvironment } from '../config.js'
import { createSessionCookieRemovalOptions, SESSION_COOKIE_NAME } from './cookie.js'
import type { SessionService, SessionUser } from './service.js'

const UNAUTHENTICATED_RESPONSE = {
  error: 'unauthenticated',
} as const

export type SessionAuthenticationOptions = {
  appEnvironment: AppEnvironment
  sessionService: SessionService
}

export async function authenticateSessionRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  options: SessionAuthenticationOptions,
): Promise<SessionUser | null> {
  const token = request.cookies[SESSION_COOKIE_NAME]

  if (token === undefined) {
    reply.status(401).send(UNAUTHENTICATED_RESPONSE)

    return null
  }

  if (token.length === 0) {
    reply
      .clearCookie(SESSION_COOKIE_NAME, createSessionCookieRemovalOptions(options.appEnvironment))
      .status(401)
      .send(UNAUTHENTICATED_RESPONSE)

    return null
  }

  const user = await options.sessionService.findUserByToken(token)

  if (!user) {
    reply
      .clearCookie(SESSION_COOKIE_NAME, createSessionCookieRemovalOptions(options.appEnvironment))
      .status(401)
      .send(UNAUTHENTICATED_RESPONSE)

    return null
  }

  return user
}
