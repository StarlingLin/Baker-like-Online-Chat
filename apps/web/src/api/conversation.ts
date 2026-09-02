import type { ConversationSummaryDto, ListConversationsResponse } from '@baker-chat/contracts'

export async function fetchConversations(): Promise<ConversationSummaryDto[]> {
  const response = await fetch('/api/conversations', {
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(`获取会话列表失败：HTTP ${response.status}`)
  }

  const responseBody = (await response.json()) as ListConversationsResponse

  return responseBody.conversations
}
