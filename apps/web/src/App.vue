<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import BakerSignOutButton from './components/auth/BakerSignOutButton.vue'
import SessionStatusScreen from './components/auth/SessionStatusScreen.vue'
import BakerConversationPanel from './components/conversation/BakerConversationPanel.vue'
import BakerMessageList from './components/conversation/BakerMessageList.vue'
import DevelopmentIdentitySelector from './components/development/DevelopmentIdentitySelector.vue'
import BakerHeader from './components/layout/BakerHeader.vue'
import BakerShell from './components/layout/BakerShell.vue'
import BakerNavigation from './components/navigation/BakerNavigation.vue'
import BakerSessionList from './components/session/BakerSessionList.vue'
import { useConversationStore } from './stores/conversation'
import { useMessageStore } from './stores/message'
import { useRealtimeStore } from './stores/realtime'
import { useSessionStore } from './stores/session'
import { formatUid } from './utils/user-display'

const conversationStore = useConversationStore()
const messageStore = useMessageStore()
const realtimeStore = useRealtimeStore()
const sessionStore = useSessionStore()
const isDevelopment = import.meta.env.DEV
const conversationPanel = ref<InstanceType<typeof BakerConversationPanel> | null>(null)

const navigationUid = computed(() => {
  if (sessionStore.user === null) {
    return '?325799?'
  }

  return formatUid(sessionStore.user.uid)
})

const selectedMessageHistory = computed(() => {
  const conversationId = conversationStore.selectedConversationId

  if (conversationId === null) {
    return null
  }

  return messageStore.getHistory(conversationId)
})

const selectedLatestMessageId = computed(() => {
  const messages = selectedMessageHistory.value?.messages

  if (messages === undefined) {
    return null
  }

  return messages[messages.length - 1]?.id ?? null
})

function restoreSession(): void {
  void sessionStore.restore()
}

function signOut(): void {
  void sessionStore.signOut()
}

function retryMessageHistory(): void {
  const conversationId = conversationStore.selectedConversationId

  if (conversationId === null) {
    return
  }

  void messageStore.loadFirstPage(conversationId)
}

async function loadOlderMessageHistory(): Promise<void> {
  const conversationId = conversationStore.selectedConversationId
  const panel = conversationPanel.value

  if (conversationId === null || panel === null) {
    return
  }

  const messageCountBeforeLoad = messageStore.getHistory(conversationId).messages.length
  const anchor = panel.capturePrependScrollAnchor()

  await messageStore.loadOlderMessages(conversationId)

  if (
    conversationStore.selectedConversationId !== conversationId ||
    conversationPanel.value !== panel
  ) {
    return
  }

  const messageCountAfterLoad = messageStore.getHistory(conversationId).messages.length

  if (messageCountAfterLoad <= messageCountBeforeLoad) {
    return
  }

  await panel.restorePrependScrollAnchor(anchor)
}

watch(
  () => sessionStore.status,
  (status) => {
    if (status === 'authenticated') {
      realtimeStore.connect()
      void conversationStore.load()
      return
    }

    realtimeStore.disconnect()
    conversationStore.reset()
    messageStore.reset()
  },
  { immediate: true },
)

watch(
  () => conversationStore.selectedConversationId,
  (conversationId) => {
    if (conversationId === null) {
      messageStore.reset()
      return
    }

    void messageStore.loadFirstPage(conversationId)
  },
  { immediate: true },
)

watch(
  [() => conversationStore.selectedConversationId, selectedLatestMessageId],
  async ([conversationId, latestMessageId], [previousConversationId]) => {
    if (conversationId === null || latestMessageId === null) {
      return
    }

    const panelBeforeUpdate = conversationPanel.value
    const shouldFollow =
      conversationId !== previousConversationId ||
      panelBeforeUpdate?.isMessageViewportAtBottom() === true

    if (!shouldFollow) {
      return
    }

    await nextTick()

    if (conversationStore.selectedConversationId !== conversationId) {
      return
    }

    conversationPanel.value?.scrollMessagesToBottom()
  },
  {
    flush: 'pre',
  },
)

onMounted(restoreSession)
</script>

<template>
  <!-- 开发测试 -->
  <DevelopmentIdentitySelector
    v-if="
      isDevelopment &&
      (sessionStore.status === 'unauthenticated' || sessionStore.developmentSignInStatus !== 'idle')
    "
  />

  <SessionStatusScreen
    v-else-if="sessionStore.status === 'idle' || sessionStore.status === 'loading'"
    mode="loading"
  />

  <SessionStatusScreen
    v-else-if="sessionStore.status === 'error'"
    mode="error"
    :message="sessionStore.errorMessage"
    @retry="restoreSession"
  />

  <SessionStatusScreen
    v-else-if="sessionStore.status === 'unauthenticated'"
    mode="unauthenticated"
  />

  <BakerShell v-else>
    <template #header>
      <BakerHeader title="群聊消息" />
    </template>

    <template #header-actions>
      <BakerSignOutButton
        :loading="sessionStore.signOutStatus === 'loading'"
        :error-message="sessionStore.signOutErrorMessage"
        @sign-out="signOut"
      />
    </template>

    <template #navigation>
      <BakerNavigation :uid="navigationUid" />
    </template>

    <template #session-list>
      <BakerSessionList />
    </template>

    <template #conversation>
      <BakerConversationPanel
        v-if="conversationStore.selectedConversation !== null"
        ref="conversationPanel"
        :title="conversationStore.selectedConversation.name ?? '未知频段'"
      >
        <BakerMessageList
          v-if="selectedMessageHistory !== null && sessionStore.user !== null"
          :messages="selectedMessageHistory.messages"
          :status="selectedMessageHistory.status"
          :error-message="selectedMessageHistory.errorMessage"
          :current-user-uid="sessionStore.user.uid"
          :next-before="selectedMessageHistory.nextBefore"
          :older-messages-status="selectedMessageHistory.olderMessagesStatus"
          :older-messages-error-message="selectedMessageHistory.olderMessagesErrorMessage"
          @retry="retryMessageHistory"
          @load-older="loadOlderMessageHistory"
        />
      </BakerConversationPanel>
    </template>
  </BakerShell>
</template>
