<script setup lang="ts">
import departureAvatarFrame from './assets/baker/avatar-frames/departure.png'
import endministratorAvatar from './assets/baker/avatars/endministrator.png'
import groupChannelAvatar from './assets/baker/avatars/group-channel.webp'
import luoxiAvatar from './assets/baker/avatars/luoxi.png'
import testEmployeeAvatar from './assets/baker/avatars/test-employee.png'
import BakerConversationPanel from './components/conversation/BakerConversationPanel.vue'
import BakerMessageItem from './components/conversation/BakerMessageItem.vue'
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
      <BakerConversationPanel title="帝江号公共频道">
        <BakerMessageItem
          display-name="管理员 #0000"
          text="欢迎来到帝江号公共频道。"
          :avatar-src="endministratorAvatar"
          :avatar-frame-src="departureAvatarFrame"
          variant="other"
        />
        <BakerMessageItem
          display-name="Starling #0001"
          text="这里可以正常显示消息吗？"
          :avatar-src="luoxiAvatar"
          :avatar-frame-src="departureAvatarFrame"
          variant="own"
        />
        <BakerMessageItem
          display-name="测试员工 #0001"
          text="收到，当前显示正常。"
          :avatar-src="testEmployeeAvatar"
          :avatar-frame-src="departureAvatarFrame"
          variant="other"
        />
      </BakerConversationPanel>
    </template>
  </BakerShell>
</template>
