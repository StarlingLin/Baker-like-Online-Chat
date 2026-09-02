<script setup lang="ts">
const props = defineProps<{
  loading: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{
  signOut: []
}>()
</script>

<template>
  <div class="baker-sign-out">
    <button
      class="baker-sign-out__button"
      type="button"
      :disabled="props.loading"
      :aria-label="props.loading ? '正在退出登录' : '退出登录'"
      :aria-busy="props.loading"
      :aria-describedby="props.errorMessage ? 'baker-sign-out-error' : undefined"
      :title="props.loading ? '正在退出登录' : '退出登录'"
      @click="emit('signOut')"
    >
      <svg
        class="baker-sign-out__icon"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        stroke-width="8.5"
        stroke-linecap="square"
        stroke-linejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M32 6v24" />
        <path d="M19.3 14.8a22 22 0 1 0 25.4 0" />
      </svg>
    </button>

    <p
      v-if="props.errorMessage"
      id="baker-sign-out-error"
      class="baker-sign-out__error"
      role="alert"
    >
      {{ props.errorMessage }}
    </p>
  </div>
</template>

<style scoped>
.baker-sign-out {
  position: relative;
  flex: 0 0 auto;
}

.baker-sign-out__button {
  --sign-out-main-size: clamp(42px, 5.2vh, 60px);
  --sign-out-tail-width: clamp(10px, 1.35vh, 15px);

  position: relative;
  isolation: isolate;
  display: grid;
  width: calc(var(--sign-out-main-size) + var(--sign-out-tail-width));
  height: var(--sign-out-main-size);
  padding: 0 var(--sign-out-tail-width) 0 0;
  border: 0;
  color: #f4f3ef;
  appearance: none;
  place-items: center;
  background: transparent;
  cursor: pointer;
  transition:
    filter 120ms ease,
    opacity 120ms ease;
}

/* 红斜纹 */
.baker-sign-out__button::before {
  position: absolute;
  z-index: 0;
  inset: 0 var(--sign-out-tail-width) 0 0;
  border-radius: clamp(5px, 0.65vh, 8px);
  background: repeating-linear-gradient(135deg, #d94747 0 3px, rgb(37 32 29 / 82%) 3px 6px);
  box-shadow: 0 5px 14px rgb(0 0 0 / 24%);
  content: '';
}

/* 暗斜纹 */
.baker-sign-out__button::after {
  position: absolute;
  z-index: 0;
  top: 8%;
  right: 0;
  bottom: 8%;
  left: calc(var(--sign-out-main-size) - 4px);
  background: repeating-linear-gradient(
    135deg,
    rgb(19 18 17 / 88%) 0 3px,
    rgb(255 255 255 / 7%) 3px 6px
  );
  clip-path: polygon(8% 0, 100% 0, 90% 100%, 0 100%);
  content: '';
}

.baker-sign-out__icon {
  position: relative;
  z-index: 1;
  width: 68%;
  height: 68%;
  max-width: none;
  pointer-events: none;
}

.baker-sign-out__button:not(:disabled):hover {
  filter: brightness(1.12) saturate(1.08);
}

.baker-sign-out__button:focus-visible {
  outline: 2px solid var(--baker-color-accent);
  outline-offset: 3px;
}

.baker-sign-out__button:disabled {
  cursor: wait;
  opacity: 0.58;
}

/* 退出失败提示 */
.baker-sign-out__error {
  position: absolute;
  z-index: 10;
  top: calc(100% + 10px);
  right: 0;
  width: max-content;
  max-width: min(320px, calc(100vw - 48px));
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgb(217 71 71 / 72%);
  border-radius: 2px;
  color: var(--baker-color-text-primary);
  font-size: 12px;
  line-height: 1.5;
  background: var(--baker-color-surface-deep);
  box-shadow: 0 10px 28px rgb(0 0 0 / 38%);
}

@media (prefers-reduced-motion: reduce) {
  .baker-sign-out__button {
    transition: none;
  }
}
</style>
