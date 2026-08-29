<script setup lang="ts">
import headerMark from '../../assets/baker/decoration/header-mark.webp'

const props = defineProps<{
  title: string
}>()
</script>

<template>
  <div class="baker-header">
    <img class="baker-header__mark" :src="headerMark" alt="" />
    <p class="baker-header__title"><span>//BAKER/</span>{{ props.title }}</p>
  </div>
</template>

<style scoped>
.baker-header {
  display: grid;
  align-content: center;
  justify-items: start;
  gap: clamp(1px, 0.2vh, 3px);
  transform: translateY(calc(-1 * clamp(4px, 0.6vh, 7px)));
}

.baker-header__mark {
  width: clamp(64px, 7.1vh, 84px);
  height: auto;
  opacity: 0.72;
}

.baker-header__title {
  margin: 0;
  color: var(--baker-color-text-primary);
  font-size: clamp(18px, 1.9vh, 24px);
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}
</style>
