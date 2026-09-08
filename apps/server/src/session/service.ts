import { eq } from 'drizzle-orm'

import type { DatabaseClient } from '../db/client.js'
import { sessions, users } from '../db/schema.js'
import { createSessionMaterial, hashSessionToken } from './token.js'

export type CreatedSession = {
  token: string
  expiresAt: Date
}

export type SessionUser = Pick<
  typeof users.$inferSelect,
  'uid' | 'nickname' | 'discriminator' | 'role'
>

export function createSessionService(database: DatabaseClient['db']) {
  return {
    async createForUser(userUid: number): Promise<CreatedSession> {
      const material = createSessionMaterial()

      await database.insert(sessions).values({
        tokenHash: material.tokenHash,
        userUid,
        expiresAt: material.expiresAt,
      })

      return {
        token: material.token,
        expiresAt: material.expiresAt,
      }
    },

    async findUserByToken(token: string): Promise<SessionUser | null> {
      const tokenHash = hashSessionToken(token)
      const [row] = await database
        .select({
          expiresAt: sessions.expiresAt,
          uid: users.uid,
          nickname: users.nickname,
          discriminator: users.discriminator,
          role: users.role,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userUid, users.uid))
        .where(eq(sessions.tokenHash, tokenHash))
        .limit(1)

      if (!row) {
        return null
      }

      if (row.expiresAt.getTime() <= Date.now()) {
        await database.delete(sessions).where(eq(sessions.tokenHash, tokenHash))

        return null
      }

      return {
        uid: row.uid,
        nickname: row.nickname,
        discriminator: row.discriminator,
        role: row.role,
      }
    },

    async findActiveByTokenHash(tokenHash: string): Promise<{ expiresAt: Date } | null> {
      const [row] = await database
        .select({
          expiresAt: sessions.expiresAt,
        })
        .from(sessions)
        .where(eq(sessions.tokenHash, tokenHash))
        .limit(1)

      if (!row || row.expiresAt.getTime() <= Date.now()) {
        return null
      }

      return row
    },

    async deleteByToken(token: string): Promise<void> {
      const tokenHash = hashSessionToken(token)

      await database.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
    },
  }
}

export type SessionService = ReturnType<typeof createSessionService>
