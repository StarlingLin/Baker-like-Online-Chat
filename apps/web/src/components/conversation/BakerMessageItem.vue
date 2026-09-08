<script setup lang="ts">
import messageBubbleOther from '../../assets/baker/decoration/message-bubble-other.png'
import messageBubbleOwn from '../../assets/baker/decoration/message-bubble-own.png'
type MessageVariant = 'other' | 'own'

const props = defineProps<{
  displayName: string
  text: string
  avatarSrc: string
  avatarFrameSrc: string
  variant: MessageVariant
}>()
</script>

<template>
  <article
    class="baker-message-item"
    :class="`baker-message-item--${props.variant}`"
    :aria-label="`${props.displayName}的消息`"
  >
    <div class="baker-message-item__avatar">
      <img class="baker-message-item__avatar-image" :src="props.avatarSrc" alt="" />
      <img class="baker-message-item__avatar-frame" :src="props.avatarFrameSrc" alt="" />
    </div>

    <div class="baker-message-item__content">
      <p class="baker-message-item__name">
        {{ props.displayName }}
      </p>
      <!-- 气泡正文 -->
      <div
        class="baker-message-item__bubble"
        :style="{
          borderImageSource: `url(${
            props.variant === 'own' ? messageBubbleOwn : messageBubbleOther
          })`,
        }"
      >
        <p class="baker-message-item__text">
          {{ props.text }}
        </p>
      </div>
      <div v-if="$slots.status" class="baker-message-item__status">
        <slot name="status" />
      </div>
    </div>
  </article>
</template>

<style scoped>
.baker-message-item {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  gap: clamp(3px, 0.5vh, 6px);
}

.baker-message-item--own {
  flex-direction: row-reverse;
}

.baker-message-item__status {
  margin-top: 4px;
  color: var(--baker-color-text-muted);
  font-size: clamp(10px, 1.2vh, 13px);
  line-height: 1.4;
}

.baker-message-item__avatar {
  position: relative;
  flex: 0 0 auto;
  width: clamp(72px, 9.2vh, 104px);
  aspect-ratio: 1;
}

.baker-message-item__avatar-image {
  position: absolute;
  inset: 12.6%;
  width: 74.8%;
  height: 74.8%;
  object-fit: cover;
}

.baker-message-item__avatar-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.baker-message-item__content {
  min-width: 0;
  max-width: 65%;
  padding-top: clamp(8px, 1vh, 12px);
}

.baker-message-item--own .baker-message-item__content {
  text-align: right;
}

.baker-message-item__name,
.baker-message-item__text {
  margin: 0;
}

.baker-message-item__name {
  font-size: clamp(10px, 1.45vh, 14px);
  font-weight: 500;
}

.baker-message-item--other .baker-message-item__name {
  margin-left: clamp(12px, 1.5vh, 17px);
}

.baker-message-item--own .baker-message-item__name {
  margin-right: clamp(12px, 1.5vh, 17px);
}

/* 切片参数直接用的 baker-dx 的 */
.baker-message-item__bubble {
  display: inline-block;
  max-width: 100%;
  margin-top: clamp(1px, 0.2vh, 3px); /* 气泡和昵称距离 */
  border-width: 3px;
  border-style: solid;
  border-color: transparent;
  border-image-repeat: repeat;
}

.baker-message-item--other .baker-message-item__bubble {
  border-image-slice: 20 20 18 30 fill;
  border-image-width: 20px 20px 18px 30px;
}

.baker-message-item--own .baker-message-item__bubble {
  border-image-slice: 20 30 18 20 fill;
  border-image-width: 20px 30px 18px 20px;
}

.baker-message-item__text {
  font-size: clamp(15px, 1.8vh, 20px);
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.baker-message-item--other .baker-message-item__text {
  padding: 8px 10px 10px 20px;
  color: #fff;
}

.baker-message-item--own .baker-message-item__text {
  padding: 8px 20px 8px 10px;
  color: #222220;
}
</style>
