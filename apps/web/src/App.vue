<script setup lang="ts">
import groupChannelAvatar from './assets/baker/avatars/group-channel.webp'
import BakerHeader from './components/layout/BakerHeader.vue'
import BakerShell from './components/layout/BakerShell.vue'
import BakerNavigation from './components/navigation/BakerNavigation.vue'
import BakerSessionCard from './components/session/BakerSessionCard.vue'
</script>

<template>
  <BakerShell>
    <template #header>
      <BakerHeader title="群聊消息" />
    </template>

    <template #navigation>
      <BakerNavigation uid="00000001" />
    </template>

    <template #session-list>
      <BakerSessionCard title="帝江号公共频道" :avatar-src="groupChannelAvatar" selected />
    </template>

    <template #conversation>
      <p>聊天区域</p>
    </template>
  </BakerShell>
</template>
