import type { MessageDto } from '@baker-chat/contracts'

import type { ConversationMessage } from './service.js'

export function createMessageDto(message: ConversationMessage): MessageDto {
  return {
    id: message.id,
    clientMessageId: message.clientMessageId,
    sender: {
      uid: message.sender.uid,
      nickname: message.sender.nickname,
      discriminator: message.sender.discriminator,
      role: message.sender.role,
    },
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }
}
