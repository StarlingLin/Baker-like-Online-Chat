import type { FastifyPluginAsync } from 'fastify'

import type { ConversationService } from '../conversation/service.js'
import {
  authenticateSessionRequest,
  type SessionAuthenticationOptions,
} from '../session/authenticate-request.js'

export type ConversationRoutesOptions = SessionAuthenticationOptions & {
  conversationService: ConversationService
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
      conversations,
    }
  })
}
