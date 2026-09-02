<script setup lang="ts">
import cardDetail from '../../assets/baker/decoration/session-card-detail.webp'
import cardFaint from '../../assets/baker/decoration/session-card-faint.webp'
import cardFrame from '../../assets/baker/decoration/session-card-frame.webp'
import cardUnderline from '../../assets/baker/decoration/session-card-underline.webp'

const props = withDefaults(
  defineProps<{
    title: string
    avatarSrc: string
    selected?: boolean
  }>(),
  {
    selected: false,
  },
)

const emit = defineEmits<{
  select: []
}>()
</script>

<template>
  <button
    class="baker-session-card"
    :class="{ 'baker-session-card--selected': props.selected }"
    type="button"
    :aria-current="props.selected ? 'true' : undefined"
    @click="emit('select')"
  >
    <img class="baker-session-card__faint" :src="cardFaint" alt="" />
    <img class="baker-session-card__frame" :src="cardFrame" alt="" />

    <span class="baker-session-card__avatar">
      <img class="baker-session-card__avatar-image" :src="props.avatarSrc" alt="" />
    </span>

    <span class="baker-session-card__content">
      <span class="baker-session-card__title">{{ props.title }}</span>
      <img class="baker-session-card__underline" :src="cardUnderline" alt="" />
    </span>

    <img class="baker-session-card__detail" :src="cardDetail" alt="" />
  </button>
</template>

<style scoped>
.baker-session-card {
  --avatar-inset: clamp(6px, 0.75vh, 9px);

  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  column-gap: clamp(12px, 1.7vh, 20px);
  width: 100%;
  height: clamp(78px, 10.2vh, 120px);
  padding: var(--avatar-inset) clamp(20px, 2.4vh, 28px) var(--avatar-inset) var(--avatar-inset);
  border: 0;
  border-radius: clamp(3px, 0.45vh, 6px);
  appearance: none;
  background: var(--baker-color-surface);
  color: var(--baker-color-text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.baker-session-card__frame,
.baker-session-card__faint {
  position: absolute;
  pointer-events: none;
}

.baker-session-card__frame {
  z-index: 2;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: fill;
  opacity: 0.5;
}

.baker-session-card__faint {
  z-index: 0;
  top: 0.4%;
  right: 0;
  width: 92.3%;
  height: 99.1%;
  object-fit: fill;
  opacity: 0.04;
}

.baker-session-card__avatar {
  position: relative;
  z-index: 1;
  display: block;
  box-sizing: border-box;
  width: auto;
  height: 100%;
  aspect-ratio: 1;
  overflow: hidden;
  border: 1px solid var(--baker-color-frame-subtle);
  border-radius: clamp(4px, 0.55vh, 7px);
  background: transparent;
}

.baker-session-card__avatar-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.baker-session-card__content {
  position: relative;
  z-index: 1;
  display: grid;
  min-width: 0;
  width: 100%;
  align-content: center;
  justify-items: start;
  row-gap: clamp(3px, 0.35vh, 5px);
}

/* 群名过长就折叠 */
.baker-session-card__title {
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  padding-right: clamp(42px, 5.5vh, 64px);
  overflow: hidden;
  font-size: clamp(16px, 2vh, 24px);
  font-weight: 500;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.baker-session-card__underline {
  width: clamp(38px, 4.8vh, 57px);
  height: auto;
  opacity: 0.4;
  pointer-events: none;
}

.baker-session-card__detail {
  position: absolute;
  z-index: 1;
  top: clamp(7px, 0.9vh, 11px);
  right: clamp(10px, 1.2vh, 15px);
  width: clamp(40px, 5.1vh, 60px);
  height: auto;
  opacity: 0.56;
  pointer-events: none;
}

.baker-session-card--selected::before,
.baker-session-card--selected::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.baker-session-card--selected {
  --selection-border-radius: clamp(4px, 0.7vh, 7px);
}

/* 高亮把原来边框隐了 */
.baker-session-card--selected .baker-session-card__frame {
  opacity: 0;
}

/* 高亮白框 */
.baker-session-card--selected::before {
  z-index: 3;
  inset: 0;
  border: 2px solid #fff;
  border-radius: var(--selection-border-radius);
}

/* 高亮四角圆弧 */
.baker-session-card--selected::after {
  --selection-corner-gap: clamp(5px, 0.5vh, 6px);
  --selection-corner-stroke: clamp(2.4px, 0.25vh, 3px);
  --selection-corner-outer-radius: calc(
    var(--selection-border-radius) + var(--selection-corner-gap)
  );
  --selection-corner-inner-radius: calc(
    var(--selection-corner-outer-radius) - var(--selection-corner-stroke)
  );

  z-index: 4;
  inset: calc(-1 * var(--selection-corner-gap));
  background:
    radial-gradient(
        circle at bottom right,
        transparent 0 var(--selection-corner-inner-radius),
        rgb(201 194 150 / 0.72) var(--selection-corner-inner-radius)
          var(--selection-corner-outer-radius),
        transparent calc(var(--selection-corner-outer-radius) + 0.5px)
      )
      top left / var(--selection-corner-outer-radius) var(--selection-corner-outer-radius) no-repeat,
    radial-gradient(
        circle at bottom left,
        transparent 0 var(--selection-corner-inner-radius),
        rgb(201 194 150 / 0.72) var(--selection-corner-inner-radius)
          var(--selection-corner-outer-radius),
        transparent calc(var(--selection-corner-outer-radius) + 0.5px)
      )
      top right / var(--selection-corner-outer-radius) var(--selection-corner-outer-radius)
      no-repeat,
    radial-gradient(
        circle at top right,
        transparent 0 var(--selection-corner-inner-radius),
        rgb(201 194 150 / 0.72) var(--selection-corner-inner-radius)
          var(--selection-corner-outer-radius),
        transparent calc(var(--selection-corner-outer-radius) + 0.5px)
      )
      bottom left / var(--selection-corner-outer-radius) var(--selection-corner-outer-radius)
      no-repeat,
    radial-gradient(
        circle at top left,
        transparent 0 var(--selection-corner-inner-radius),
        rgb(201 194 150 / 0.72) var(--selection-corner-inner-radius)
          var(--selection-corner-outer-radius),
        transparent calc(var(--selection-corner-outer-radius) + 0.5px)
      )
      bottom right / var(--selection-corner-outer-radius) var(--selection-corner-outer-radius)
      no-repeat;
}

.baker-session-card:focus-visible {
  outline: 2px solid var(--baker-color-frame);
  outline-offset: 3px;
}
</style>
