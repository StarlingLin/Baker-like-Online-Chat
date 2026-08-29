<script setup lang="ts">
import friendsIcon from '../../assets/baker/navigation/friends.png'
import groupChatIcon from '../../assets/baker/navigation/group-chat.png'

/* 外层传入UID */
const props = defineProps<{
  uid: string
}>()
</script>

<template>
  <div class="baker-navigation">
    <nav aria-label="消息分类">
      <ul class="baker-navigation__items">
        <li>
          <button
            class="baker-navigation__item baker-navigation__item--active"
            type="button"
            aria-label="群聊消息"
            aria-current="page"
          >
            <img :src="groupChatIcon" alt="" />
          </button>
        </li>

        <li>
          <button class="baker-navigation__item" type="button" aria-label="好友沟通" disabled>
            <img :src="friendsIcon" alt="" />
          </button>
        </li>
      </ul>
    </nav>

    <p class="baker-navigation__uid">UID: {{ props.uid }}</p>
  </div>
</template>

<style scoped>
.baker-navigation {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  --navigation-top-offset: clamp(8px, 1vh, 12px);
  height: calc(100% - var(--navigation-top-offset));
  margin-top: var(--navigation-top-offset);
  position: relative;
  isolation: isolate;
}

.baker-navigation nav {
  min-height: 0;
}

/* 斜纹 */
.baker-navigation::before {
  position: absolute;
  z-index: 0;
  inset: 0;
  content: '';
  pointer-events: none;
  background: repeating-linear-gradient(
    135deg,
    rgb(255 255 255 / 0.18) 0 1px,
    transparent 1.8px 3.2px /* 试了下感觉最接近的密度和显示效果 */
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0%,
    #000 6%,
    #000 72%,
    transparent 100%
  );
  mask-image: linear-gradient(to bottom, transparent 0%, #000 6%, #000 72%, transparent 100%);
}

.baker-navigation nav,
.baker-navigation__uid {
  position: relative;
  z-index: 1;
}

.baker-navigation__items {
  margin: 0;
  padding: 0;
  list-style: none;
}

.baker-navigation__item {
  position: relative;
  isolation: isolate;
  display: grid;
  width: 100%;
  height: clamp(78px, 9.5vh, 112px);
  padding: 0 clamp(18px, 2.4vh, 28px) 0 0;
  border: 0;
  appearance: none;
  place-items: center end;
  background: transparent;
  color: inherit;
}

.baker-navigation__item:disabled {
  cursor: not-allowed;
  opacity: 1;
}

.baker-navigation__item:focus-visible {
  outline: 2px solid var(--baker-color-accent);
  outline-offset: -2px;
}

.baker-navigation__item img {
  position: relative;
  z-index: 1;
  width: clamp(50px, 7vh, 84px);
  height: clamp(50px, 7vh, 84px);
  object-fit: contain;
  pointer-events: none;
}

/* 选中态 */
.baker-navigation__item--active {
  --active-block-overhang: clamp(4px, 0.6vh, 8px);
  --active-inline-overhang: clamp(8px, 1vh, 12px);

  color: var(--baker-color-background);
  cursor: default;
}

.baker-navigation__item--active::before {
  position: absolute;
  z-index: 0;
  top: calc(-1 * var(--active-block-overhang));
  right: calc(-1 * var(--active-inline-overhang));
  bottom: calc(-1 * var(--active-block-overhang));
  left: 0;
  content: '';
  pointer-events: none;
  background-color: var(--baker-color-accent);
  border-radius: clamp(2px, 0.3vh, 4px);
}

.baker-navigation__item--active::after {
  position: absolute;
  z-index: 0;
  top: calc(-1 * var(--active-block-overhang));
  right: calc(-1 * var(--active-inline-overhang));
  bottom: calc(-1 * var(--active-block-overhang));
  left: 0;
  border-radius: clamp(2px, 0.3vh, 4px);
  background: url('../../assets/baker/navigation/active-contour-texture.png') no-repeat right
    center / auto 100%;
  content: '';
  opacity: 0.35;
  pointer-events: none;
}

.baker-navigation__item--active img {
  filter: brightness(0);
}

.baker-navigation__uid {
  justify-self: end;
  margin: 0;
  padding-right: clamp(8px, 1vh, 12px);
  color: var(--baker-color-text-muted);
  font-size: clamp(10px, 1.15vh, 14px);
  white-space: nowrap;
}
</style>
