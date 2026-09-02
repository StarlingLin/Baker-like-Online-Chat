<script setup lang="ts">
import { formatUserDisplayName } from '@/utils/user-display'
import type { MessageDto } from '@baker-chat/contracts'
import departureAvatarFrame from '../../assets/baker/avatar-frames/departure.png'
import endministratorAvatar from '../../assets/baker/avatars/endministrator.png'
import luoxiAvatar from '../../assets/baker/avatars/luoxi.png'
import testEmployeeAvatar from '../../assets/baker/avatars/test-employee.png'
import BakerMessageItem from './BakerMessageItem.vue'

type MessageListStatus = 'idle' | 'loading' | 'ready' | 'error'
type MessageVariant = 'other' | 'own'

const props = defineProps<{
  messages: MessageDto[]
  status: MessageListStatus
  errorMessage: string | null
  currentUserUid: number
}>()

const emit = defineEmits<{
  retry: []
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
</script>

<template>
  <div
    class="baker-message-list"
    role="log"
    aria-label="消息列表"
    :aria-busy="props.status === 'idle' || props.status === 'loading'"
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
      v-else-if="props.messages.length === 0"
      class="baker-message-list__state baker-message-list__state--empty"
      role="status"
    >
      <p class="baker-message-list__state-title">当前暂无通讯记录</p>
    </div>

    <template v-else>
      <BakerMessageItem
        v-for="message in props.messages"
        :key="message.id"
        :display-name="formatUserDisplayName(message.sender)"
        :text="message.content"
        :avatar-src="getAvatarSource(message.sender.uid)"
        :avatar-frame-src="departureAvatarFrame"
        :variant="getMessageVariant(message.sender.uid)"
      />
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
  .baker-message-list__retry {
    transition: none;
  }
}
</style>
