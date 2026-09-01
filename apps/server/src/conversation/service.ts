import { asc, eq } from 'drizzle-orm'

import type { DatabaseClient } from '../db/client.js'
import { conversationMembers, conversations } from '../db/schema.js'

export type ConversationSummary = {
  id: number
  kind: 'group' | 'direct'
  name: string | null
  membershipRole: 'owner' | 'admin' | 'member'
  createdAt: Date
}

export function createConversationService(database: DatabaseClient['db']) {
  return {
    async listForUser(userUid: number): Promise<ConversationSummary[]> {
      return database
        .select({
          id: conversations.id,
          kind: conversations.kind,
          name: conversations.name,
          membershipRole: conversationMembers.role,
          createdAt: conversations.createdAt,
        })
        .from(conversationMembers)
        .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
        .where(eq(conversationMembers.userUid, userUid))
        .orderBy(asc(conversations.id))
    },
  }
}

export type ConversationService = ReturnType<typeof createConversationService>
