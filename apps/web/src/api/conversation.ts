import type {
  ConversationSummaryDto,
  ListConversationsResponse,
  ListMessageHistoryResponse,
} from '@baker-chat/contracts'

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

export async function fetchMessageHistory(
  conversationId: number,
  before?: number,
): Promise<ListMessageHistoryResponse> {
  const queryString = before === undefined ? '' : `?before=${before}`

  const response = await fetch(`/api/conversations/${conversationId}/messages${queryString}`, {
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(`获取历史消息失败：HTTP ${response.status}`)
  }

  return (await response.json()) as ListMessageHistoryResponse
}
