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

export type SendMessageForUserOptions = {
  conversationId: number
  senderUid: number
  clientMessageId: string
  content: string
}

export type SendMessageForUserResult =
  | {
      status: 'created'
      message: ConversationMessage
    }
  | {
      status: 'duplicate'
      message: ConversationMessage
    }
  | {
      status: 'conversation_not_found'
    }
  | {
      status: 'client_message_conflict'
    }

const storedMessageSelection = {
  id: messages.id,
  clientMessageId: messages.clientMessageId,
  content: messages.content,
  createdAt: messages.createdAt,
}

const messageSenderSelection = {
  uid: users.uid,
  nickname: users.nickname,
  discriminator: users.discriminator,
  role: users.role,
}

type StoredConversationMessage = Omit<ConversationMessage, 'sender'>

function createConversationMessage(
  message: StoredConversationMessage,
  sender: MessageSender,
): ConversationMessage {
  return {
    id: message.id,
    clientMessageId: message.clientMessageId,
    sender,
    content: message.content,
    createdAt: message.createdAt,
  }
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
          message: storedMessageSelection,
          sender: messageSenderSelection,
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
      const nextBefore = hasMore ? (pageRows.at(-1)?.message.id ?? null) : null

      return {
        messages: pageRows
          .reverse()
          .map((row) => createConversationMessage(row.message, row.sender)),
        nextBefore,
      }
    },

    async sendMessageForUser(
      options: SendMessageForUserOptions,
    ): Promise<SendMessageForUserResult> {
      return database.transaction(async (transaction): Promise<SendMessageForUserResult> => {
        const [membership] = await transaction
          .select({
            sender: messageSenderSelection,
          })
          .from(conversationMembers)
          .innerJoin(users, eq(users.uid, conversationMembers.userUid))
          .where(
            and(
              eq(conversationMembers.conversationId, options.conversationId),
              eq(conversationMembers.userUid, options.senderUid),
            ),
          )
          .limit(1)
          .for('key share', {
            of: conversationMembers,
          })

        if (!membership) {
          return {
            status: 'conversation_not_found',
          }
        }

        const [createdMessage] = await transaction
          .insert(messages)
          .values({
            conversationId: options.conversationId,
            senderUid: options.senderUid,
            clientMessageId: options.clientMessageId,
            content: options.content,
          })
          .onConflictDoNothing({
            target: [messages.senderUid, messages.clientMessageId],
          })
          .returning(storedMessageSelection)

        if (createdMessage) {
          return {
            status: 'created',
            message: createConversationMessage(createdMessage, membership.sender),
          }
        }

        const [existingMessageRow] = await transaction
          .select({
            conversationId: messages.conversationId,
            message: storedMessageSelection,
          })
          .from(messages)
          .where(
            and(
              eq(messages.senderUid, options.senderUid),
              eq(messages.clientMessageId, options.clientMessageId),
            ),
          )
          .limit(1)

        if (!existingMessageRow) {
          throw new Error('消息唯一键冲突后找不到原消息')
        }

        if (
          existingMessageRow.conversationId !== options.conversationId ||
          existingMessageRow.message.content !== options.content
        ) {
          return {
            status: 'client_message_conflict',
          }
        }

        return {
          status: 'duplicate',
          message: createConversationMessage(existingMessageRow.message, membership.sender),
        }
      })
    },
  }
}

export type ConversationService = ReturnType<typeof createConversationService>
