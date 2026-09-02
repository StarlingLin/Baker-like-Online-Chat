<script setup lang="ts">
type SessionStatusScreenMode = 'loading' | 'error' | 'unauthenticated'

const props = defineProps<{
  mode: SessionStatusScreenMode
  message?: string | null
}>()

const emit = defineEmits<{
  retry: []
}>()
</script>

<template>
  <main class="session-status-screen">
    <section
      class="session-status-screen__panel"
      :class="{
        'session-status-screen__panel--delayed': props.mode === 'loading',
      }"
      aria-labelledby="session-status-title"
      :role="props.mode === 'error' ? 'alert' : props.mode === 'loading' ? 'status' : undefined"
      :aria-live="props.mode === 'loading' ? 'polite' : undefined"
    >
      <p class="session-status-screen__eyebrow">BAKER ONLINE</p>

      <template v-if="props.mode === 'loading'">
        <h1 id="session-status-title" class="session-status-screen__title">通讯接入</h1>

        <p class="session-status-screen__description">正在与帝江号建立连接</p>
      </template>

      <template v-else-if="props.mode === 'error'">
        <h1 id="session-status-title" class="session-status-screen__title">连接失败</h1>

        <p class="session-status-screen__description">
          {{ props.message ?? '暂时无法与帝江号建立连接。' }}
        </p>

        <button class="session-status-screen__retry" type="button" @click="emit('retry')">
          重启连接
        </button>
      </template>

      <template v-else>
        <h1 id="session-status-title" class="session-status-screen__title">身份认证系统离线</h1>

        <p class="session-status-screen__description">OAuth 协议接入中……</p>
      </template>
    </section>
  </main>
</template>

<style scoped>
.session-status-screen {
  display: grid;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 24px;
  color: var(--baker-color-text-primary);
  place-items: center;
  background:
    linear-gradient(135deg, rgb(255 255 255 / 3%), transparent 42%), var(--baker-color-background);
}

.session-status-screen__panel {
  position: relative;
  width: min(460px, 100%);
  overflow: hidden;
  padding: 32px;
  border: 1px solid var(--baker-color-frame-subtle);
  border-radius: 2px;
  background: var(--baker-color-surface-deep);
  box-shadow: 0 20px 60px rgb(0 0 0 / 45%);
}

.session-status-screen__panel::before {
  position: absolute;
  top: 0;
  left: 0;
  width: 72px;
  height: 3px;
  background: var(--baker-color-accent);
  content: '';
}

/* 卡超过180ms才弹状态窗 */
.session-status-screen__panel--delayed {
  animation: session-status-screen-panel-reveal 120ms ease-out 180ms both;
}

.session-status-screen__eyebrow {
  margin: 0 0 10px;
  color: var(--baker-color-accent);
  font-size: 12px;
  letter-spacing: 0.16em;
}

.session-status-screen__title {
  margin: 0;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 600;
}

.session-status-screen__description {
  margin: 14px 0 0;
  color: var(--baker-color-text-muted);
  font-size: 14px;
  line-height: 1.7;
}

.session-status-screen__retry {
  margin-top: 24px;
  padding: 9px 20px;
  border: 1px solid rgb(255 255 255 / 30%);
  border-radius: 2px;
  color: var(--baker-color-text-primary);
  appearance: none;
  background: rgb(255 255 255 / 7%);
  cursor: pointer;
  transition:
    border-color 120ms ease,
    background-color 120ms ease;
}

.session-status-screen__retry:hover {
  border-color: var(--baker-color-accent);
  background: rgb(255 255 255 / 11%);
}

.session-status-screen__retry:focus-visible {
  outline: 2px solid var(--baker-color-accent);
  outline-offset: 3px;
}

@keyframes session-status-screen-panel-reveal {
  from {
    visibility: hidden;
    opacity: 0;
    transform: translateY(4px);
  }

  to {
    visibility: visible;
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .session-status-screen__panel--delayed {
    animation-duration: 1ms;
  }
}
</style>
