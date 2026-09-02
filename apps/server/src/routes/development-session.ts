import type {
  CreateDevelopmentSessionRequest,
  ListDevelopmentUsersResponse,
} from '@baker-chat/contracts'
import { asc, eq, inArray } from 'drizzle-orm'
import type { FastifyPluginAsync } from 'fastify'

import type { DatabaseClient } from '../db/client.js'
import { users } from '../db/schema.js'
import { createSessionCookieOptions, SESSION_COOKIE_NAME } from '../session/cookie.js'
import type { SessionService } from '../session/service.js'

const DEVELOPMENT_USER_UIDS = [0, 1, 9999_9999]

const developmentSessionRequestSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['uid'],
  properties: {
    uid: {
      type: 'integer',
      enum: DEVELOPMENT_USER_UIDS,
    },
  },
} as const

export type DevelopmentSessionRoutesOptions = {
  database: DatabaseClient['db']
  sessionService: SessionService
}

export const developmentSessionRoutes: FastifyPluginAsync<DevelopmentSessionRoutesOptions> = async (
  app,
  options,
) => {
  app.get('/api/dev/users', async () => {
    const developmentUsers = await options.database
      .select({
        uid: users.uid,
        nickname: users.nickname,
        discriminator: users.discriminator,
        role: users.role,
      })
      .from(users)
      .where(inArray(users.uid, DEVELOPMENT_USER_UIDS))
      .orderBy(asc(users.uid))

    return {
      users: developmentUsers,
    } satisfies ListDevelopmentUsersResponse
  })

  app.post<{ Body: CreateDevelopmentSessionRequest }>(
    '/api/dev/session',
    {
      schema: {
        body: developmentSessionRequestSchema,
      },
    },
    async (request, reply) => {
      const { uid } = request.body

      const [developmentUser] = await options.database
        .select({
          uid: users.uid,
        })
        .from(users)
        .where(eq(users.uid, uid))
        .limit(1)

      if (!developmentUser) {
        return reply.status(404).send({
          error: 'development_user_not_found',
        })
      }

      const existingToken = request.cookies[SESSION_COOKIE_NAME]

      if (existingToken) {
        await options.sessionService.deleteByToken(existingToken)
      }

      const session = await options.sessionService.createForUser(uid)

      return reply
        .setCookie(
          SESSION_COOKIE_NAME,
          session.token,
          createSessionCookieOptions('development', session.expiresAt),
        )
        .status(204)
        .send()
    },
  )
}
