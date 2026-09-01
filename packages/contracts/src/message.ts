import { z } from 'zod'

export const CONVERSATION_ID_MAX_VALUE = 21_4748_3647
export const MESSAGE_CONTENT_MAX_LENGTH = 2000
export const SEND_MESSAGE_EVENT = 'message:send' /* 客户端 */
export const MESSAGE_CREATED_EVENT = 'message:created' /* 服务端 */

function countUnicodeCodePoints(value: string): number {
  return Array.from(value).length
}

export const messageContentSchema = z
  .string()
  .refine((content) => content.trim().length > 0, {
    error: '消息不能只包含空白字符哦',
  })
  .refine((content) => countUnicodeCodePoints(content) <= MESSAGE_CONTENT_MAX_LENGTH, {
    error: `消息不能超过 ${MESSAGE_CONTENT_MAX_LENGTH} 个字符哦`,
  })

export const sendMessagePayloadSchema = z.strictObject({
  conversationId: z.int().min(1).max(CONVERSATION_ID_MAX_VALUE),
  clientMessageId: z.uuidv4(),
  content: messageContentSchema,
})

// 客户端1
export type SendMessagePayload = z.infer<typeof sendMessagePayloadSchema>

// 数据传输对象
export type MessageSenderDto = {
  uid: number
  nickname: string
  discriminator: number
  role: 'user' | 'admin'
}

export type MessageDto = {
  id: number
  clientMessageId: string
  sender: MessageSenderDto
  content: string
  createdAt: string
}

export const SEND_MESSAGE_ERROR_CODES = [
  'invalid_payload',
  'conversation_not_found',
  'client_message_conflict',
  'internal_error',
] as const

export type SendMessageErrorCode = (typeof SEND_MESSAGE_ERROR_CODES)[number]

export type SendMessageAcknowledgement =
  | {
      ok: true
      message: MessageDto
    }
  | {
      ok: false
      error: SendMessageErrorCode
    }

// 服务端1
export type MessageCreatedPayload = {
  conversationId: number
  message: MessageDto
}

// 客户端2
export type SendMessageAcknowledgementCallback = (result: SendMessageAcknowledgement) => void

// 客户端能发的
export type ClientToServerEvents = {
  [SEND_MESSAGE_EVENT]: (
    payload: SendMessagePayload,
    acknowledge: SendMessageAcknowledgementCallback,
  ) => void
}
// 服务端能推的
export type ServerToClientEvents = {
  [MESSAGE_CREATED_EVENT]: (payload: MessageCreatedPayload) => void
}
