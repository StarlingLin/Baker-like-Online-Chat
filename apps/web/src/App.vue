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
const messageDrafts = ref<Record<number, string>>({})
const submitError = ref<string | null>(null)

const selectedMessageDraft = computed({
  get(): string {
    const conversationId = conversationStore.selectedConversationId

    return conversationId === null ? '' : (messageDrafts.value[conversationId] ?? '')
  },
  set(value: string): void {
    const conversationId = conversationStore.selectedConversationId

    if (conversationId !== null) {
      messageDrafts.value[conversationId] = value
    }
  },
})

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

const selectedOutgoingMessages = computed(() => {
  const conversationId = conversationStore.selectedConversationId

  return conversationId === null ? [] : messageStore.getOutgoingMessages(conversationId)
})

const selectedOutgoingLayoutKey = computed(() =>
  selectedOutgoingMessages.value
    .map(
      (message) =>
        `${message.sender.uid}:${message.payload.clientMessageId}:${message.state.status}`,
    )
    .join('|'),
)

const canSubmitMessage = computed(
  () =>
    sessionStore.status === 'authenticated' &&
    sessionStore.user !== null &&
    sessionStore.signOutStatus !== 'loading' &&
    realtimeStore.status === 'connected' &&
    selectedMessageHistory.value?.status === 'ready',
)

function submitCurrentMessage(): void {
  const conversationId = conversationStore.selectedConversationId
  const content = selectedMessageDraft.value

  if (conversationId === null || !canSubmitMessage.value || content.trim().length === 0) {
    return
  }

  const result = realtimeStore.submitMessage(conversationId, content)

  if (!result.ok) {
    submitError.value = result.errorMessage
    return
  }

  submitError.value = null
  messageDrafts.value[conversationId] = ''
}

async function retryOutgoingMessage(clientMessageId: string): Promise<void> {
  const conversationId = conversationStore.selectedConversationId
  const user = sessionStore.user

  if (conversationId === null || user === null || !canSubmitMessage.value) {
    return
  }

  const message = messageStore
    .getOutgoingMessages(conversationId)
    .find(
      (item) => item.sender.uid === user.uid && item.payload.clientMessageId === clientMessageId,
    )

  if (message === undefined || message.state.status !== 'unconfirmed') {
    return
  }

  try {
    await realtimeStore.sendOutgoingMessage(conversationId, clientMessageId)
  } catch {
    if (
      sessionStore.status !== 'authenticated' ||
      sessionStore.user?.uid !== user.uid ||
      !messageStore.getOutgoingMessages(conversationId).includes(message)
    ) {
      return
    }

    messageStore.setOutgoingMessageState(conversationId, user.uid, clientMessageId, {
      status: 'unconfirmed',
    })
  }
}

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
    messageDrafts.value = {}
    submitError.value = null
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
  [
    () => conversationStore.selectedConversationId,
    selectedLatestMessageId,
    selectedOutgoingLayoutKey,
  ],
  async ([conversationId, latestMessageId, outgoingLayoutKey], [previousConversationId]) => {
    if (conversationId === null || (latestMessageId === null && outgoingLayoutKey === '')) {
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
  { flush: 'pre' },
)

watch(
  [() => conversationStore.selectedConversationId, selectedMessageDraft],
  () => {
    submitError.value = null
  },
  { flush: 'sync' },
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
        v-model:draft="selectedMessageDraft"
        v-if="conversationStore.selectedConversation !== null"
        ref="conversationPanel"
        :title="conversationStore.selectedConversation.name ?? '未知频段'"
        :can-submit="canSubmitMessage"
        :submit-error="submitError"
        @submit="submitCurrentMessage"
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
          :outgoing-messages="selectedOutgoingMessages"
          :can-retry="canSubmitMessage"
          @retry-message="retryOutgoingMessage"
          @retry="retryMessageHistory"
          @load-older="loadOlderMessageHistory"
        />
      </BakerConversationPanel>
    </template>
  </BakerShell>
</template>
