<script setup lang="ts">
import { useScrollEdges } from '@/composables/use-scroll-edges'
import { nextTick } from 'vue'
import inputTopDecoration from '../../assets/baker/decoration/conversation-input-top.webp'
import groupHeaderCenter from '../../assets/baker/decoration/group-header-center.webp'
import groupHeaderLeft from '../../assets/baker/decoration/group-header-left.webp'
import groupHeaderMarquee from '../../assets/baker/decoration/group-header-marquee.png'
import groupHeaderRight from '../../assets/baker/decoration/group-header-right.webp'

const props = defineProps<{
  title: string
}>()

const { scrollViewport, scrollContent, canScrollUp, canScrollDown, updateScrollEdges } =
  useScrollEdges()

function capturePrependScrollAnchor(): {
  scrollHeight: number
  scrollTop: number
} | null {
  const viewport = scrollViewport.value

  if (viewport === null) {
    return null
  }

  return {
    scrollHeight: viewport.scrollHeight,
    scrollTop: viewport.scrollTop,
  }
}

async function restorePrependScrollAnchor(
  anchor: {
    scrollHeight: number
    scrollTop: number
  } | null,
): Promise<void> {
  if (anchor === null) {
    return
  }

  await nextTick()

  const viewport = scrollViewport.value

  if (viewport === null) {
    return
  }

  const addedHeight = viewport.scrollHeight - anchor.scrollHeight

  viewport.scrollTop = anchor.scrollTop + addedHeight
  updateScrollEdges()
}

function isMessageViewportAtBottom(): boolean {
  updateScrollEdges()

  return !canScrollDown.value
}

function scrollMessagesToBottom(): void {
  const viewport = scrollViewport.value

  if (viewport === null) {
    return
  }

  viewport.scrollTop = viewport.scrollHeight
  updateScrollEdges()
}

defineExpose({
  capturePrependScrollAnchor,
  restorePrependScrollAnchor,
  isMessageViewportAtBottom,
  scrollMessagesToBottom,
})
</script>

<template>
  <section class="baker-conversation-panel" :aria-label="`${props.title}聊天窗口`">
    <!-- 标题栏 -->
    <header class="baker-conversation-panel__header">
      <img
        class="baker-conversation-panel__header-segment baker-conversation-panel__header-segment--left"
        :src="groupHeaderLeft"
        alt=""
        aria-hidden="true"
      />

      <div class="baker-conversation-panel__header-center">
        <img
          class="baker-conversation-panel__header-segment baker-conversation-panel__header-segment--center"
          :src="groupHeaderCenter"
          alt=""
          aria-hidden="true"
        />

        <h2 class="baker-conversation-panel__title">
          {{ props.title }}
        </h2>
      </div>

      <img
        class="baker-conversation-panel__header-segment baker-conversation-panel__header-segment--right"
        :src="groupHeaderRight"
        alt=""
        aria-hidden="true"
      />

      <span class="baker-conversation-panel__header-marquee-viewport" aria-hidden="true">
        <span
          class="baker-conversation-panel__header-marquee-content"
          :style="{ backgroundImage: `url(${groupHeaderMarquee})` }"
        ></span>
      </span>
    </header>
    <!-- 聊天窗口 -->
    <div class="baker-conversation-panel__window">
      <!-- 凹口装饰和三色线 -->
      <div class="baker-conversation-panel__frame-top" aria-hidden="true">
        <svg
          class="baker-conversation-panel__frame-notch"
          viewBox="0 0 232 10"
          preserveAspectRatio="none"
        >
          <path d="M0 0 L16 6 L216 6 L232 0" />
        </svg>

        <span class="baker-conversation-panel__frame-bars">
          <span
            class="baker-conversation-panel__frame-bar baker-conversation-panel__frame-bar--magenta"
          ></span>
          <span
            class="baker-conversation-panel__frame-bar baker-conversation-panel__frame-bar--yellow"
          ></span>
          <span
            class="baker-conversation-panel__frame-bar baker-conversation-panel__frame-bar--cyan"
          ></span>
        </span>
      </div>
      <!-- 消息区 -->
      <div
        class="baker-conversation-panel__messages-viewport"
        :class="{
          'baker-conversation-panel__messages-viewport--can-scroll-up': canScrollUp,
          'baker-conversation-panel__messages-viewport--can-scroll-down': canScrollDown,
        }"
      >
        <div
          ref="scrollViewport"
          class="baker-conversation-panel__messages"
          @scroll.passive="updateScrollEdges"
        >
          <div ref="scrollContent" class="baker-conversation-panel__messages-content">
            <slot />
          </div>
        </div>

        <span
          class="baker-conversation-panel__message-edge baker-conversation-panel__message-edge--top"
          aria-hidden="true"
        ></span>
        <span
          class="baker-conversation-panel__message-edge baker-conversation-panel__message-edge--bottom"
          aria-hidden="true"
        ></span>
      </div>
      <!-- 输入区 -->
      <footer class="baker-conversation-panel__composer">
        <span
          class="baker-conversation-panel__input-decoration"
          :style="{ borderImageSource: `url(${inputTopDecoration})` }"
          aria-hidden="true"
        ></span>
        <!-- 抗拉伸 -->

        <input
          class="baker-conversation-panel__input"
          type="text"
          placeholder="发消息"
          aria-label="消息输入框（当前只读）"
          readonly
        />
      </footer>
    </div>
  </section>
</template>

<style scoped>
.baker-conversation-panel {
  display: grid;
  grid-template-rows: clamp(54px, 6.8vh, 78px) minmax(0, 1fr);
  gap: clamp(6px, 0.8vh, 10px);
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* 标题条 */
.baker-conversation-panel__header {
  position: relative;
  isolation: isolate;
  display: flex;
  min-width: 0;
  align-items: stretch;
  overflow: hidden;
}

.baker-conversation-panel__header-segment {
  display: block;
  height: 100%;
  max-width: none;
  pointer-events: none;
  user-select: none;
}

.baker-conversation-panel__header-segment--left,
.baker-conversation-panel__header-segment--right {
  flex: 0 0 auto;
  width: auto;
}

.baker-conversation-panel__header-center {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}

.baker-conversation-panel__header-segment--center {
  width: 100%;
  object-fit: fill;
}

/* 滚动字遮罩 */
.baker-conversation-panel__header-marquee-viewport {
  --mask-left-width: clamp(20.45px, 2.58vh, 29.55px);
  --mask-left-gray-start: clamp(9px, 1.13vh, 13px);
  --mask-left-gray-end: clamp(10.64px, 1.34vh, 15.36px);
  --mask-right-width: clamp(360px, 45.33vh, 520px);
  --mask-right-gap-end-offset: clamp(32.73px, 4.12vh, 47.27px);
  --mask-right-cap-width: clamp(76.09px, 9.58vh, 109.91px);
  --mask-right-start: calc(100% - var(--mask-right-width));
  --mask-right-gap-start: calc(var(--mask-right-start) + var(--mask-left-width));
  --mask-right-gap-end: calc(var(--mask-right-start) + var(--mask-right-gap-end-offset));
  --mask-right-cap-start: calc(100% - var(--mask-right-cap-width));

  position: absolute;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;

  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0 var(--mask-left-gray-start),
    #000 var(--mask-left-gray-start) var(--mask-left-gray-end),
    transparent var(--mask-left-gray-end) var(--mask-left-width),
    #000 var(--mask-left-width) var(--mask-right-start),
    transparent var(--mask-right-start) var(--mask-right-gap-start),
    #000 var(--mask-right-gap-start) var(--mask-right-gap-end),
    transparent var(--mask-right-gap-end) var(--mask-right-cap-start),
    #000 var(--mask-right-cap-start) 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0 var(--mask-left-gray-start),
    #000 var(--mask-left-gray-start) var(--mask-left-gray-end),
    transparent var(--mask-left-gray-end) var(--mask-left-width),
    #000 var(--mask-left-width) var(--mask-right-start),
    transparent var(--mask-right-start) var(--mask-right-gap-start),
    #000 var(--mask-right-gap-start) var(--mask-right-gap-end),
    transparent var(--mask-right-gap-end) var(--mask-right-cap-start),
    #000 var(--mask-right-cap-start) 100%
  );
}

.baker-conversation-panel__header-marquee-content {
  --marquee-image-width: clamp(384px, 48.36vh, 555px);
  --marquee-image-height: clamp(54px, 6.8vh, 78px);
  --marquee-image-half-height: clamp(27px, 3.4vh, 39px);
  position: absolute;
  top: calc(0px - var(--marquee-image-half-height));
  left: 100%;
  width: var(--marquee-image-width);
  height: var(--marquee-image-height);
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  opacity: 0.08;
  animation: baker-header-marquee-scroll 20s linear infinite;
}

.baker-conversation-panel__title {
  position: absolute;
  z-index: 2;
  top: 50%;
  right: clamp(12px, 1.8vh, 20px);
  left: clamp(16px, 2.3vh, 26px);
  overflow: hidden;
  margin: 0;
  font-size: clamp(17px, 2.1vh, 24px);
  font-weight: 500;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  transform: translateY(-50%);
}

/* 聊天框 */
.baker-conversation-panel__window {
  --frame-color: rgb(202 201 201 / 0.62);
  --frame-line-width: clamp(1px, 0.14vh, 1.5px);
  --frame-notch-width: clamp(174px, 21.5vh, 232px);
  --frame-notch-height: clamp(8px, 0.93vh, 10px);
  --frame-end-width: clamp(24px, 3vh, 32px);
  --frame-bars-right: clamp(33px, 4.1vh, 44px);
  --frame-bar-width: clamp(48px, 5.9vh, 64px);
  --frame-bar-gap: clamp(6px, 0.74vh, 8px);
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 0;
  overflow: hidden;
  border: 0;
  border-right: var(--frame-line-width) solid var(--frame-color);
  border-bottom: var(--frame-line-width) solid var(--frame-color);
  border-left: var(--frame-line-width) solid var(--frame-color);
  border-radius: 0 0 clamp(10px, 1.3vh, 16px) clamp(10px, 1.3vh, 16px);
  background: rgb(20 20 19 / 0.2);
  box-shadow:
    inset 0 0 28px rgb(255 255 255 / 0.025),
    0 8px 28px rgb(0 0 0 / 0.16);
}

/* 顶部装饰 */
.baker-conversation-panel__frame-top {
  position: absolute;
  z-index: 4;
  top: 0;
  right: 0;
  left: 0;
  height: var(--frame-notch-height);
  color: var(--frame-color);
  pointer-events: none;
}

.baker-conversation-panel__frame-top::before,
.baker-conversation-panel__frame-top::after {
  position: absolute;
  top: 0;
  height: var(--frame-line-width);
  background: currentcolor;
  content: '';
}

.baker-conversation-panel__frame-top::before {
  right: calc(var(--frame-notch-width) + var(--frame-end-width));
  left: 0;
}

.baker-conversation-panel__frame-top::after {
  right: 0;
  width: var(--frame-end-width);
}

.baker-conversation-panel__frame-notch {
  position: absolute;
  top: 0;
  right: var(--frame-end-width);
  width: var(--frame-notch-width);
  height: var(--frame-notch-height);
  overflow: visible;
}

.baker-conversation-panel__frame-notch path {
  fill: none;
  stroke: currentcolor;
  stroke-width: var(--frame-line-width);
  vector-effect: non-scaling-stroke;
}

.baker-conversation-panel__frame-bars {
  position: absolute;
  top: 10%;
  right: var(--frame-bars-right);
  display: flex;
  gap: var(--frame-bar-gap);
}

.baker-conversation-panel__frame-bar {
  display: block;
  width: var(--frame-bar-width);
  height: clamp(2px, 0.23vh, 2.5px);
}

.baker-conversation-panel__frame-bar--magenta {
  background: #ff2ea8;
  box-shadow: 0 0 7px rgb(255 46 168 / 0.68);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 8px 100%);
}

.baker-conversation-panel__frame-bar--yellow {
  background: #f4e924;
  box-shadow: 0 0 7px rgb(244 233 36 / 0.58);
}

.baker-conversation-panel__frame-bar--cyan {
  background: #1ddde1;
  box-shadow: 0 0 7px rgb(29 221 225 / 0.62);
  clip-path: polygon(0 0, 100% 0, calc(100% - 8px) 100%, 0 100%);
}

.baker-conversation-panel__messages-viewport {
  --message-edge-fade-height: clamp(6px, 0.8vh, 10px);
  --message-viewport-inset: clamp(10px, 1.2vh, 18px);
  position: relative;
  min-height: 0;
  margin-block: var(--message-viewport-inset);
  overflow: hidden;
  background: linear-gradient(90deg, rgb(255 255 255 / 0.015), transparent 32%, rgb(0 0 0 / 0.08));
}

.baker-conversation-panel__messages {
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}

.baker-conversation-panel__messages::-webkit-scrollbar {
  display: none;
}

.baker-conversation-panel__messages-viewport--can-scroll-up .baker-conversation-panel__messages {
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 var(--message-edge-fade-height),
    #000 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 var(--message-edge-fade-height),
    #000 100%
  );
}

.baker-conversation-panel__messages-viewport--can-scroll-down .baker-conversation-panel__messages {
  -webkit-mask-image: linear-gradient(
    to bottom,
    #000 0,
    #000 calc(100% - var(--message-edge-fade-height)),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    #000 0,
    #000 calc(100% - var(--message-edge-fade-height)),
    transparent 100%
  );
}

.baker-conversation-panel__messages-viewport--can-scroll-up.baker-conversation-panel__messages-viewport--can-scroll-down
  .baker-conversation-panel__messages {
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 var(--message-edge-fade-height),
    #000 calc(100% - var(--message-edge-fade-height)),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 var(--message-edge-fade-height),
    #000 calc(100% - var(--message-edge-fade-height)),
    transparent 100%
  );
}

.baker-conversation-panel__messages-content {
  display: flex;
  box-sizing: border-box;
  min-height: 100%;
  flex-direction: column;
  gap: clamp(14px, 1.9vh, 22px);
  padding: clamp(18px, 2.7vh, 28px) clamp(16px, 2.4vh, 26px);
}

.baker-conversation-panel__message-edge {
  position: absolute;
  z-index: 3;
  right: 0;
  left: 0;
  height: var(--message-edge-fade-height);
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms ease;
  -webkit-backdrop-filter: blur(clamp(1px, 0.16vh, 2px));
  backdrop-filter: blur(clamp(1px, 0.16vh, 2px));
}

.baker-conversation-panel__message-edge--top {
  top: 0;
  background: linear-gradient(to bottom, rgb(20 20 19 / 0.26), transparent);

  -webkit-mask-image: linear-gradient(to bottom, #000, transparent);
  mask-image: linear-gradient(to bottom, #000, transparent);
}

.baker-conversation-panel__message-edge--bottom {
  bottom: 0;
  background: linear-gradient(to top, rgb(20 20 19 / 0.26), transparent);

  -webkit-mask-image: linear-gradient(to top, #000, transparent);
  mask-image: linear-gradient(to top, #000, transparent);
}

.baker-conversation-panel__messages-viewport--can-scroll-up
  .baker-conversation-panel__message-edge--top {
  opacity: 1;
}

.baker-conversation-panel__messages-viewport--can-scroll-down
  .baker-conversation-panel__message-edge--bottom {
  opacity: 1;
}

/* 输入区 */
.baker-conversation-panel__composer {
  position: relative;
  display: flex;
  min-height: clamp(60px, 7.8vh, 88px);
  align-items: center;
  padding: clamp(10px, 1.45vh, 16px) clamp(18px, 2.3vh, 28px);
  border-top: 1px solid rgb(202 201 201 / 0.34);
  background: rgb(60 59 57 / 0.94);
}

/* 贴在输入区上边缘 */
.baker-conversation-panel__input-decoration {
  --decoration-height: clamp(8px, 1.1vh, 13px);
  --decoration-cap-width: clamp(18px, 2.48vh, 29px);
  position: absolute;
  z-index: 3;
  top: 0;
  left: 1.5%;
  display: block;
  width: 97%;
  height: var(--decoration-height);
  border-style: solid;
  border-width: 0 var(--decoration-cap-width) 0 0;
  border-image-slice: 0 36 0 0 fill;
  border-image-width: 0 var(--decoration-cap-width) 0 0;
  border-image-repeat: stretch;
  opacity: 0.72;
  pointer-events: none;
  transform: translateY(-135%);
}

/* 当前只读 */
.baker-conversation-panel__input {
  position: relative;
  z-index: 2;
  display: block;
  width: 100%;
  height: clamp(36px, 4.8vh, 54px);
  padding: 0 clamp(18px, 2.4vh, 28px);
  border: 0;
  border-radius: 999px;
  outline: 0;
  background: #efefef;
  color: #222220;
  box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.15);
  cursor: default;
}

.baker-conversation-panel__input::placeholder {
  color: rgb(34 34 32 / 0.92);
  opacity: 1;
}

/* 滚动底 */
@keyframes baker-header-marquee-scroll {
  0% {
    left: 100%;
  }

  85% {
    left: calc(0px - var(--marquee-image-width));
  }

  100% {
    left: calc(0px - var(--marquee-image-width));
  }
}

@media (prefers-reduced-motion: reduce) {
  .baker-conversation-panel__header-marquee-content {
    animation: none;
  }
  .baker-conversation-panel__message-edge {
    transition: none;
  }
}
</style>
