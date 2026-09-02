export type ConversationKind = 'group' | 'direct'

export type ConversationMembershipRole = 'owner' | 'admin' | 'member'

export type ConversationSummaryDto = {
  id: number
  kind: ConversationKind
  name: string | null
  membershipRole: ConversationMembershipRole
  createdAt: string
}

export type ListConversationsResponse = {
  conversations: ConversationSummaryDto[]
}
