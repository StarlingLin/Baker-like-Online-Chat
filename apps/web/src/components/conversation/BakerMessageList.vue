<script setup lang="ts">
import type { OutgoingMessage, OutgoingMessageState } from '@/stores/message'
import { formatUserDisplayName } from '@/utils/user-display'
import type { MessageDto } from '@baker-chat/contracts'
import departureAvatarFrame from '../../assets/baker/avatar-frames/departure.png'
import endministratorAvatar from '../../assets/baker/avatars/endministrator.png'
import luoxiAvatar from '../../assets/baker/avatars/luoxi.png'
import testEmployeeAvatar from '../../assets/baker/avatars/test-employee.png'
import BakerMessageItem from './BakerMessageItem.vue'

type MessageListStatus = 'idle' | 'loading' | 'ready' | 'error'
type MessageVariant = 'other' | 'own'
type OlderMessagesStatus = 'idle' | 'loading' | 'error'

const props = defineProps<{
  messages: MessageDto[]
  status: MessageListStatus
  errorMessage: string | null
  currentUserUid: number
  nextBefore: number | null
  olderMessagesStatus: OlderMessagesStatus
  olderMessagesErrorMessage: string | null
  outgoingMessages: OutgoingMessage[]
  canRetry: boolean
}>()

const emit = defineEmits<{
  retry: []
  loadOlder: []
  retryMessage: [clientMessageId: string]
}>()

const avatarSources = new Map<number, string>([
  [0, endministratorAvatar],
  [1, luoxiAvatar],
  [9999_9999, testEmployeeAvatar],
])

function getAvatarSource(uid: number): string {
  return avatarSources.get(uid) ?? testEmployeeAvatar
}

function getMessageVariant(senderUid: number): MessageVariant {
  return senderUid === props.currentUserUid ? 'own' : 'other'
}

function getOutgoingStatusText(state: OutgoingMessageState): string {
  switch (state.status) {
    case 'sending':
      return '发送中'
    case 'unconfirmed':
      return '未确认送达'
    case 'failed':
      return '发送失败'
  }
}
</script>

<template>
  <div
    class="baker-message-list"
    role="log"
    aria-label="消息列表"
    :aria-busy="
      props.status === 'idle' ||
      props.status === 'loading' ||
      props.olderMessagesStatus === 'loading'
    "
  >
    <div
      v-if="props.status === 'idle' || props.status === 'loading'"
      class="baker-message-list__state baker-message-list__state--loading"
      role="status"
    >
      <p class="baker-message-list__state-title">正在同步通讯记录</p>
    </div>

    <div
      v-else-if="props.status === 'error'"
      class="baker-message-list__state baker-message-list__state--error"
      role="alert"
    >
      <p class="baker-message-list__state-title">通讯记录同步失败</p>

      <p v-if="props.errorMessage !== null" class="baker-message-list__state-detail">
        {{ props.errorMessage }}
      </p>

      <button class="baker-message-list__retry" type="button" @click="emit('retry')">
        重新同步
      </button>
    </div>

    <div
      v-else-if="props.messages.length === 0 && props.outgoingMessages.length === 0"
      class="baker-message-list__state baker-message-list__state--empty"
      role="status"
    >
      <p class="baker-message-list__state-title">当前暂无通讯记录</p>
    </div>

    <template v-else>
      <div v-if="props.nextBefore !== null" class="baker-message-list__older">
        <p
          v-if="props.olderMessagesStatus === 'error' && props.olderMessagesErrorMessage !== null"
          class="baker-message-list__older-error"
          role="alert"
        >
          {{ props.olderMessagesErrorMessage }}
        </p>

        <button
          class="baker-message-list__older-button"
          type="button"
          :disabled="props.olderMessagesStatus === 'loading'"
          @click="emit('loadOlder')"
        >
          {{
            props.olderMessagesStatus === 'loading'
              ? '正在加载更早消息'
              : props.olderMessagesStatus === 'error'
                ? '重新加载更早消息'
                : '加载更早消息'
          }}
        </button>
      </div>

      <BakerMessageItem
        v-for="message in props.messages"
        :key="message.id"
        :display-name="formatUserDisplayName(message.sender)"
        :text="message.content"
        :avatar-src="getAvatarSource(message.sender.uid)"
        :avatar-frame-src="departureAvatarFrame"
        :variant="getMessageVariant(message.sender.uid)"
      />

      <BakerMessageItem
        v-for="message in props.outgoingMessages"
        :key="`outgoing:${message.sender.uid}:${message.payload.clientMessageId}`"
        :display-name="formatUserDisplayName(message.sender)"
        :text="message.payload.content"
        :avatar-src="getAvatarSource(message.sender.uid)"
        :avatar-frame-src="departureAvatarFrame"
        :variant="getMessageVariant(message.sender.uid)"
      >
        <template #status>
          <button
            v-if="message.state.status === 'unconfirmed'"
            class="baker-message-list__retry-message"
            type="button"
            :disabled="!props.canRetry"
            @click="emit('retryMessage', message.payload.clientMessageId)"
          >
            未确认送达-重试
          </button>
          <span v-else>
            {{ getOutgoingStatusText(message.state) }}
          </span>
        </template>
      </BakerMessageItem>
    </template>
  </div>
</template>

<style scoped>
.baker-message-list {
  display: flex;
  min-width: 0;
  flex: 1 0 auto;
  flex-direction: column;
  gap: clamp(14px, 1.9vh, 22px);
}

.baker-message-list__older {
  display: flex;
  min-height: clamp(34px, 4.3vh, 48px);
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(5px, 0.65vh, 8px);
  padding: clamp(2px, 0.35vh, 4px) 0;
}

.baker-message-list__older-error {
  max-width: min(100%, 480px);
  margin: 0;
  color: rgb(255 184 176 / 0.9);
  font-size: clamp(11px, 1.25vh, 14px);
  line-height: 1.4;
  text-align: center;
  overflow-wrap: anywhere;
}

.baker-message-list__older-button {
  position: relative;
  min-height: clamp(29px, 3.5vh, 38px);
  padding: 0 clamp(20px, 2.7vh, 30px);
  border: 1px solid rgb(255 255 255 / 0.32);
  border-radius: clamp(2px, 0.25vh, 3px);
  background: linear-gradient(
    90deg,
    rgb(255 255 255 / 0.035),
    rgb(255 255 255 / 0.1),
    rgb(255 255 255 / 0.035)
  );
  color: var(--baker-color-text-muted);
  font: inherit;
  font-size: clamp(11px, 1.3vh, 15px);
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    border-color 120ms ease,
    background-color 120ms ease,
    color 120ms ease;
}

.baker-message-list__older-button::before {
  position: absolute;
  top: 50%;
  left: clamp(7px, 0.9vh, 10px);
  width: clamp(3px, 0.35vh, 4px);
  height: clamp(12px, 1.5vh, 17px);
  background: var(--baker-color-accent);
  content: '';
  opacity: 0.78;
  transform: translateY(-50%);
}

.baker-message-list__older-button:hover:not(:disabled) {
  border-color: rgb(255 239 0 / 0.7);
  background: rgb(255 239 0 / 0.08);
  color: var(--baker-color-text-primary);
}

.baker-message-list__older-button:focus-visible {
  outline: 2px solid var(--baker-color-accent);
  outline-offset: 3px;
}

.baker-message-list__older-button:disabled {
  cursor: wait;
  opacity: 0.58;
}

.baker-message-list__state {
  position: relative;
  display: grid;
  min-height: clamp(96px, 12vh, 138px);
  flex: 1 0 auto;
  align-content: center;
  justify-items: center;
  gap: clamp(7px, 0.9vh, 10px);
  padding: clamp(16px, 2vh, 24px);
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.025) 50%, transparent);
  color: var(--baker-color-text-muted);
  font-size: clamp(13px, 1.5vh, 17px);
  line-height: 1.45;
  text-align: center;
}

.baker-message-list__state::before {
  width: clamp(32px, 4.2vh, 48px);
  height: clamp(2px, 0.24vh, 3px);
  background: var(--baker-color-accent);
  box-shadow: 0 0 8px rgb(255 239 0 / 0.24);
  content: '';
}

.baker-message-list__state--error {
  color: var(--baker-color-text-primary);
}

.baker-message-list__state-title,
.baker-message-list__state-detail {
  margin: 0;
}

.baker-message-list__state-title {
  font-size: clamp(14px, 1.7vh, 19px);
  font-weight: 500;
}

.baker-message-list__state-detail {
  max-width: min(100%, 480px);
  overflow-wrap: anywhere;
  color: var(--baker-color-text-muted);
  font-size: clamp(12px, 1.35vh, 15px);
}

.baker-message-list__retry {
  min-height: clamp(30px, 3.7vh, 42px);
  padding: 0 clamp(16px, 2vh, 22px);
  border: 1px solid var(--baker-color-frame);
  border-radius: clamp(2px, 0.3vh, 4px);
  background: rgb(255 239 0 / 0.08);
  color: var(--baker-color-text-primary);
  font: inherit;
  font-size: clamp(12px, 1.4vh, 16px);
  cursor: pointer;
  transition:
    border-color 120ms ease,
    background-color 120ms ease,
    color 120ms ease;
}

.baker-message-list__retry-message {
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.baker-message-list__retry-message:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.baker-message-list__retry-message:focus-visible {
  outline: 1px solid currentcolor;
  outline-offset: 2px;
}

.baker-message-list__retry:hover {
  border-color: var(--baker-color-accent);
  background: var(--baker-color-accent);
  color: var(--baker-color-background);
}

.baker-message-list__retry:focus-visible {
  outline: 2px solid var(--baker-color-accent);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .baker-message-list__retry,
  .baker-message-list__older-button {
    transition: none;
  }
}
</style>
