<script setup lang="ts">
import { onMounted } from 'vue'

import { useSessionStore } from '@/stores/session'
import { formatUid, formatUserDisplayName } from '@/utils/user-display'

const sessionStore = useSessionStore()

function loadDevelopmentUsers(): void {
  void sessionStore.loadDevelopmentUsers()
}

function signInAsDevelopmentUser(uid: number): void {
  void sessionStore.signInAsDevelopmentUser(uid)
}

onMounted(loadDevelopmentUsers)
</script>

<template>
  <div
    class="development-identity"
    role="dialog"
    aria-modal="true"
    aria-labelledby="development-identity-title"
  >
    <section class="development-identity__panel">
      <p class="development-identity__eyebrow">DEVELOPMENT ONLY</p>

      <h1 id="development-identity-title" class="development-identity__title">选择开发身份</h1>

      <p class="development-identity__description">
        该入口仅用于本地测试。选择一个账号后，服务端将创建对应的开发 Session。
      </p>

      <p
        v-if="sessionStore.developmentSignInStatus === 'loading'"
        class="development-identity__status development-identity__sign-in-message"
        role="status"
      >
        正在创建 Session 并验证身份……
      </p>

      <div
        v-else-if="sessionStore.developmentSignInStatus === 'error'"
        class="development-identity__error development-identity__sign-in-message"
        role="alert"
      >
        <p>
          {{ sessionStore.developmentSignInErrorMessage ?? '开发身份登录失败，请重新选择账号' }}
        </p>
      </div>

      <p
        v-if="
          sessionStore.developmentUsersStatus === 'idle' ||
          sessionStore.developmentUsersStatus === 'loading'
        "
        class="development-identity__status"
        role="status"
      >
        正在加载开发账号……
      </p>

      <div
        v-else-if="sessionStore.developmentUsersStatus === 'error'"
        class="development-identity__error"
        role="alert"
      >
        <p>
          {{ sessionStore.developmentUsersErrorMessage ?? '加载开发账号失败' }}
        </p>

        <button class="development-identity__retry" type="button" @click="loadDevelopmentUsers">
          重试
        </button>
      </div>

      <p
        v-else-if="sessionStore.developmentUsers.length === 0"
        class="development-identity__status"
      >
        没有可用的开发账号。
      </p>

      <ul v-else class="development-identity__list">
        <li v-for="user in sessionStore.developmentUsers" :key="user.uid">
          <button
            class="development-identity__user"
            type="button"
            :disabled="sessionStore.developmentSignInStatus === 'loading'"
            @click="signInAsDevelopmentUser(user.uid)"
          >
            <span class="development-identity__name">
              {{ formatUserDisplayName(user) }}
            </span>

            <span class="development-identity__uid"> UID {{ formatUid(user.uid) }} </span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.development-identity {
  position: fixed;
  z-index: 100;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  color: #f4f4ef;
  background: rgb(4 6 7 / 82%);
  backdrop-filter: blur(8px);
}

.development-identity__panel {
  width: min(460px, 100%);
  max-height: calc(100dvh - 48px);
  overflow: auto;
  padding: 28px;
  border: 1px solid rgb(255 255 255 / 24%);
  background: #171a1c;
  box-shadow: 0 20px 60px rgb(0 0 0 / 45%);
}

.development-identity__eyebrow {
  margin: 0 0 8px;
  color: #e7c84f;
  font-size: 12px;
  letter-spacing: 0.16em;
}

.development-identity__title {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
}

.development-identity__description {
  margin: 12px 0 24px;
  color: rgb(244 244 239 / 68%);
  font-size: 14px;
  line-height: 1.6;
}

.development-identity__status,
.development-identity__error {
  margin: 0;
  padding: 18px;
  color: rgb(244 244 239 / 76%);
  background: rgb(255 255 255 / 6%);
}

.development-identity__error p {
  margin: 0 0 14px;
}

.development-identity__retry {
  padding: 8px 16px;
  border: 1px solid rgb(255 255 255 / 35%);
  color: inherit;
  font: inherit;
  background: rgb(255 255 255 / 8%);
  cursor: pointer;
}

.development-identity__list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.development-identity__user {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  width: 100%;
  min-height: 58px;
  padding: 12px 16px;
  border: 1px solid rgb(255 255 255 / 15%);
  color: inherit;
  font: inherit;
  text-align: left;
  appearance: none;
  background: rgb(255 255 255 / 6%);
  cursor: pointer;
  transition:
    border-color 120ms ease,
    background-color 120ms ease,
    opacity 120ms ease;
}

.development-identity__user:not(:disabled):hover {
  border-color: rgb(231 200 79 / 70%);
  background: rgb(255 255 255 / 10%);
}

.development-identity__user:focus-visible {
  outline: 2px solid #e7c84f;
  outline-offset: 2px;
}

.development-identity__user:disabled {
  cursor: wait;
  opacity: 0.55;
}

.development-identity__sign-in-message {
  margin-bottom: 16px;
}

.development-identity__name {
  overflow: hidden;
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.development-identity__uid {
  color: rgb(244 244 239 / 55%);
  font-size: 12px;
  letter-spacing: 0.06em;
}
</style>
