import { and, asc, desc, eq, lt } from 'drizzle-orm'

import type { DatabaseClient } from '../db/client.js'
import { conversationMembers, conversations, messages, users } from '../db/schema.js'

const MESSAGE_HISTORY_PAGE_SIZE = 50

export type ConversationSummary = {
  id: number
  kind: 'group' | 'direct'
  name: string | null
  membershipRole: 'owner' | 'admin' | 'member'
  createdAt: Date
}

export type MessageSender = {
  uid: number
  nickname: string
  discriminator: number
  role: 'user' | 'admin'
}

export type ConversationMessage = {
  id: number
  clientMessageId: string
  sender: MessageSender
  content: string
  createdAt: Date
}

export type MessageHistoryPage = {
  messages: ConversationMessage[]
  nextBefore: number | null
}

export type ListMessageHistoryOptions = {
  conversationId: number
  userUid: number
  beforeMessageId?: number
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

    async listMessageHistoryForUser(
      options: ListMessageHistoryOptions,
    ): Promise<MessageHistoryPage | null> {
      const messageConditions = [eq(messages.conversationId, options.conversationId)]

      if (options.beforeMessageId !== undefined) {
        messageConditions.push(lt(messages.id, options.beforeMessageId))
      }

      const messageRows = await database
        .select({
          id: messages.id,
          clientMessageId: messages.clientMessageId,
          senderUid: users.uid,
          senderNickname: users.nickname,
          senderDiscriminator: users.discriminator,
          senderRole: users.role,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .innerJoin(
          conversationMembers,
          and(
            eq(conversationMembers.conversationId, messages.conversationId),
            eq(conversationMembers.userUid, options.userUid),
          ),
        )
        .innerJoin(users, eq(messages.senderUid, users.uid))
        .where(and(...messageConditions))
        .orderBy(desc(messages.id))
        .limit(MESSAGE_HISTORY_PAGE_SIZE + 1)

      if (messageRows.length === 0) {
        const [membership] = await database
          .select({
            userUid: conversationMembers.userUid,
          })
          .from(conversationMembers)
          .where(
            and(
              eq(conversationMembers.conversationId, options.conversationId),
              eq(conversationMembers.userUid, options.userUid),
            ),
          )
          .limit(1)

        if (!membership) {
          return null
        }
      }

      const hasMore = messageRows.length > MESSAGE_HISTORY_PAGE_SIZE
      const pageRows = messageRows.slice(0, MESSAGE_HISTORY_PAGE_SIZE)
      const nextBefore = hasMore ? (pageRows.at(-1)?.id ?? null) : null

      return {
        messages: pageRows.reverse().map((row) => ({
          id: row.id,
          clientMessageId: row.clientMessageId,
          sender: {
            uid: row.senderUid,
            nickname: row.senderNickname,
            discriminator: row.senderDiscriminator,
            role: row.senderRole,
          },
          content: row.content,
          createdAt: row.createdAt,
        })),
        nextBefore,
      }
    },
  }
}

export type ConversationService = ReturnType<typeof createConversationService>
