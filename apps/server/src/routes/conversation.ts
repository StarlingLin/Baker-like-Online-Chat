import type { ListConversationsResponse } from '@baker-chat/contracts'
import type { FastifyPluginAsync } from 'fastify'

import type { ConversationService } from '../conversation/service.js'
import {
  authenticateSessionRequest,
  type SessionAuthenticationOptions,
} from '../session/authenticate-request.js'

const POSTGRES_INTEGER_MAX = 21_4748_3647
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/

const INVALID_CONVERSATION_ID_RESPONSE = {
  error: 'invalid_conversation_id',
} as const

const INVALID_MESSAGE_CURSOR_RESPONSE = {
  error: 'invalid_message_cursor',
} as const

const INVALID_MESSAGE_QUERY_RESPONSE = {
  error: 'invalid_message_query',
} as const

const CONVERSATION_NOT_FOUND_RESPONSE = {
  error: 'conversation_not_found',
} as const

type MessageHistoryRequest = {
  Params: {
    conversationId: string
  }
  Querystring: {
    before?: unknown
    [key: string]: unknown
  }
}

export type ConversationRoutesOptions = SessionAuthenticationOptions & {
  conversationService: ConversationService
}

function parsePositiveInteger(value: unknown): number | null {
  if (typeof value !== 'string' || !POSITIVE_INTEGER_PATTERN.test(value)) {
    return null
  }

  const parsedValue = Number(value)

  if (!Number.isSafeInteger(parsedValue) || parsedValue > POSTGRES_INTEGER_MAX) {
    return null
  }

  return parsedValue
}

export const conversationRoutes: FastifyPluginAsync<ConversationRoutesOptions> = async (
  app,
  options,
) => {
  app.get('/api/conversations', async (request, reply) => {
    const user = await authenticateSessionRequest(request, reply, options)

    if (!user) {
      return reply
    }

    const conversations = await options.conversationService.listForUser(user.uid)

    return {
      conversations: conversations.map((conversation) => ({
        id: conversation.id,
        kind: conversation.kind,
        name: conversation.name,
        membershipRole: conversation.membershipRole,
        createdAt: conversation.createdAt.toISOString(),
      })),
    } satisfies ListConversationsResponse
  })

  app.get<MessageHistoryRequest>(
    '/api/conversations/:conversationId/messages',
    async (request, reply) => {
      const user = await authenticateSessionRequest(request, reply, options)

      if (!user) {
        return reply
      }

      const hasUnsupportedQuery = Object.keys(request.query).some((key) => key !== 'before')

      if (hasUnsupportedQuery) {
        return reply.status(400).send(INVALID_MESSAGE_QUERY_RESPONSE)
      }

      const conversationId = parsePositiveInteger(request.params.conversationId)

      if (conversationId === null) {
        return reply.status(400).send(INVALID_CONVERSATION_ID_RESPONSE)
      }

      let beforeMessageId: number | undefined

      if (request.query.before !== undefined) {
        const parsedBeforeMessageId = parsePositiveInteger(request.query.before)

        if (parsedBeforeMessageId === null) {
          return reply.status(400).send(INVALID_MESSAGE_CURSOR_RESPONSE)
        }

        beforeMessageId = parsedBeforeMessageId
      }

      const historyPage = await options.conversationService.listMessageHistoryForUser({
        conversationId,
        userUid: user.uid,
        ...(beforeMessageId === undefined ? {} : { beforeMessageId }),
      })

      if (!historyPage) {
        return reply.status(404).send(CONVERSATION_NOT_FOUND_RESPONSE)
      }

      return historyPage
    },
  )
}
