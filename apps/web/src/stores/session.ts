import type { PublicUserDto } from '@baker-chat/contracts'
import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  createDevelopmentSession,
  deleteCurrentSession,
  fetchCurrentSession,
  fetchDevelopmentUsers,
} from '@/api/session'

// 还没开始恢复 | 正在请求session | 已恢复身份 | 没有有效身份 | 故障机器人()
export type SessionStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'
export type DevelopmentUsersStatus = 'idle' | 'loading' | 'ready' | 'error'
export type DevelopmentSignInStatus = 'idle' | 'loading' | 'error'
export type SignOutStatus = 'idle' | 'loading' | 'error'

function getErrorMessage(error: unknown, fallbackMessage: string): string {
  return error instanceof Error ? error.message : fallbackMessage
}

export const useSessionStore = defineStore('session', () => {
  const status = ref<SessionStatus>('idle')
  const user = ref<PublicUserDto | null>(null)
  const errorMessage = ref<string | null>(null)

  const signOutStatus = ref<SignOutStatus>('idle')
  const signOutErrorMessage = ref<string | null>(null)

  const developmentUsers = ref<PublicUserDto[]>([])
  const developmentUsersStatus = ref<DevelopmentUsersStatus>('idle')
  const developmentUsersErrorMessage = ref<string | null>(null)
  const developmentSignInStatus = ref<DevelopmentSignInStatus>('idle')
  const developmentSignInErrorMessage = ref<string | null>(null)

  async function restore(): Promise<void> {
    if (status.value === 'loading') {
      return
    }

    status.value = 'loading'
    user.value = null
    errorMessage.value = null

    try {
      const restoredUser = await fetchCurrentSession()

      user.value = restoredUser
      status.value = restoredUser ? 'authenticated' : 'unauthenticated'
    } catch (error) {
      errorMessage.value = getErrorMessage(error, '恢复当前 Session 时发生未知错误')
      status.value = 'error'
    }
  }

  async function signOut(): Promise<void> {
    if (status.value !== 'authenticated' || signOutStatus.value === 'loading') {
      return
    }

    signOutStatus.value = 'loading'
    signOutErrorMessage.value = null

    try {
      await deleteCurrentSession()

      user.value = null
      errorMessage.value = null
      status.value = 'unauthenticated'
      signOutStatus.value = 'idle'
    } catch (error) {
      signOutErrorMessage.value = getErrorMessage(error, '退出登录时发生未知错误')
      signOutStatus.value = 'error'
    }
  }

  async function loadDevelopmentUsers(): Promise<void> {
    if (!import.meta.env.DEV || developmentUsersStatus.value === 'loading') {
      return
    }

    developmentUsersStatus.value = 'loading'
    developmentUsers.value = []
    developmentUsersErrorMessage.value = null

    try {
      const users = await fetchDevelopmentUsers()

      developmentUsers.value = users
      developmentUsersStatus.value = 'ready'
    } catch (error) {
      developmentUsersErrorMessage.value = getErrorMessage(error, '加载开发账号时发生未知错误')
      developmentUsersStatus.value = 'error'
    }
  }

  async function signInAsDevelopmentUser(uid: number): Promise<void> {
    if (
      !import.meta.env.DEV ||
      developmentSignInStatus.value === 'loading' ||
      status.value === 'loading'
    ) {
      return
    }

    developmentSignInStatus.value = 'loading'
    developmentSignInErrorMessage.value = null

    try {
      await createDevelopmentSession(uid)
      await restore()

      if (status.value !== 'authenticated') {
        developmentSignInErrorMessage.value =
          errorMessage.value ?? '创建开发 Session 后未能恢复登录身份'
        developmentSignInStatus.value = 'error'

        return
      }

      developmentSignInStatus.value = 'idle'
    } catch (error) {
      developmentSignInErrorMessage.value = getErrorMessage(
        error,
        '创建开发 Session 时发生未知错误',
      )
      developmentSignInStatus.value = 'error'
    }
  }

  return {
    status,
    user,
    errorMessage,
    signOutStatus,
    signOutErrorMessage,
    developmentUsers,
    developmentUsersStatus,
    developmentUsersErrorMessage,
    developmentSignInStatus,
    developmentSignInErrorMessage,
    restore,
    signOut,
    loadDevelopmentUsers,
    signInAsDevelopmentUser,
  }
})
