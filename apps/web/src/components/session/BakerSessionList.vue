<script setup lang="ts">
import groupChannelAvatar from '@/assets/baker/avatars/group-channel.webp'
import { useScrollEdges } from '@/composables/use-scroll-edges'
import { useConversationStore } from '@/stores/conversation'

import BakerSessionCard from './BakerSessionCard.vue'

const conversationStore = useConversationStore()

const { scrollViewport, scrollContent, canScrollUp, canScrollDown, updateScrollEdges } =
  useScrollEdges()

function retryLoad(): void {
  void conversationStore.load()
}
</script>

<template>
  <section
    class="baker-session-list"
    :class="{
      'baker-session-list--can-scroll-up': canScrollUp,
      'baker-session-list--can-scroll-down': canScrollDown,
    }"
    aria-label="群聊列表"
  >
    <div
      ref="scrollViewport"
      class="baker-session-list__viewport"
      :aria-busy="conversationStore.status === 'loading'"
      @scroll.passive="updateScrollEdges"
    >
      <div ref="scrollContent" class="baker-session-list__content">
        <p
          v-if="
            (conversationStore.status === 'idle' || conversationStore.status === 'loading') &&
            conversationStore.conversations.length === 0
          "
          class="baker-session-list__state"
          role="status"
        >
          正在同步通讯频段
        </p>

        <div
          v-else-if="conversationStore.status === 'error'"
          class="baker-session-list__state baker-session-list__state--error"
          role="alert"
        >
          <strong class="baker-session-list__state-title">通讯频段同步失败</strong>
          <span class="baker-session-list__state-detail">
            {{ conversationStore.errorMessage ?? '发生未知错误' }}
          </span>
          <button class="baker-session-list__retry" type="button" @click="retryLoad">
            重新同步
          </button>
        </div>

        <p
          v-else-if="
            conversationStore.status === 'ready' && conversationStore.conversations.length === 0
          "
          class="baker-session-list__state"
        >
          当前没有可用频段
        </p>

        <template v-else>
          <BakerSessionCard
            v-for="conversation in conversationStore.conversations"
            :key="conversation.id"
            :title="conversation.name ?? '未知频段'"
            :avatar-src="groupChannelAvatar"
            :selected="conversation.id === conversationStore.selectedConversationId"
            @select="conversationStore.selectConversation(conversation.id)"
          />
        </template>
      </div>
    </div>

    <span class="baker-session-list__edge baker-session-list__edge--top" aria-hidden="true"></span>
    <span
      class="baker-session-list__edge baker-session-list__edge--bottom"
      aria-hidden="true"
    ></span>
  </section>
</template>

<style scoped>
.baker-session-list {
  --edge-fade-height: clamp(39px, 5.1vh, 60px);

  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.baker-session-list__viewport {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.baker-session-list__viewport::-webkit-scrollbar {
  display: none;
}

.baker-session-list__content {
  display: flex;
  box-sizing: border-box;
  min-height: 100%;
  flex-direction: column;
  gap: clamp(10px, 1.4vh, 16px);
  padding: clamp(6px, 0.75vh, 9px);
}

.baker-session-list__state {
  position: relative;
  display: grid;
  box-sizing: border-box;
  min-height: clamp(78px, 10.2vh, 120px);
  align-content: center;
  justify-items: center;
  gap: clamp(7px, 0.9vh, 10px);
  margin: 0;
  padding: clamp(16px, 2.1vh, 24px);
  border: 1px solid var(--baker-color-frame-subtle);
  border-radius: clamp(3px, 0.45vh, 6px);
  background:
    linear-gradient(135deg, rgb(255 255 255 / 0.04), transparent 46%), rgb(41 40 39 / 0.82);
  color: var(--baker-color-text-muted);
  font-size: clamp(13px, 1.5vh, 17px);
  line-height: 1.45;
  text-align: center;
}

.baker-session-list__state::before {
  width: clamp(32px, 4.2vh, 48px);
  height: clamp(2px, 0.24vh, 3px);
  background: var(--baker-color-accent);
  box-shadow: 0 0 8px rgb(255 239 0 / 0.24);
  content: '';
}

.baker-session-list__state--error {
  color: var(--baker-color-text-primary);
}

.baker-session-list__state-title {
  font-size: clamp(14px, 1.7vh, 19px);
  font-weight: 500;
}

.baker-session-list__state-detail {
  max-width: 100%;
  overflow-wrap: anywhere;
  color: var(--baker-color-text-muted);
  font-size: clamp(12px, 1.35vh, 15px);
}

.baker-session-list__retry {
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

.baker-session-list__retry:hover {
  border-color: var(--baker-color-accent);
  background: var(--baker-color-accent);
  color: var(--baker-color-background);
}

.baker-session-list__retry:focus-visible {
  outline: 2px solid var(--baker-color-accent);
  outline-offset: 3px;
}

.baker-session-list__edge {
  position: absolute;
  z-index: 5;
  right: 0;
  left: 0;
  height: var(--edge-fade-height);
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
  backdrop-filter: blur(clamp(2px, 0.35vh, 4px));
}

.baker-session-list__edge--top {
  top: 0;
  background: linear-gradient(to bottom, rgb(20 20 19 / 0.42), transparent);

  -webkit-mask-image: linear-gradient(to bottom, #000, transparent);
  mask-image: linear-gradient(to bottom, #000, transparent);
}

.baker-session-list__edge--bottom {
  bottom: 0;
  background: linear-gradient(to top, rgb(20 20 19 / 0.42), transparent);

  -webkit-mask-image: linear-gradient(to top, #000, transparent);
  mask-image: linear-gradient(to top, #000, transparent);
}

.baker-session-list--can-scroll-up .baker-session-list__edge--top {
  opacity: 1;
}

.baker-session-list--can-scroll-down .baker-session-list__edge--bottom {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .baker-session-list__edge,
  .baker-session-list__retry {
    transition: none;
  }
}
</style>
