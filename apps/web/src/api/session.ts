import type {
  CreateDevelopmentSessionRequest,
  GetSessionResponse,
  ListDevelopmentUsersResponse,
  PublicUserDto,
} from '@baker-chat/contracts'

export async function fetchCurrentSession(): Promise<PublicUserDto | null> {
  const response = await fetch('/api/session', {
    credentials: 'same-origin',
  })

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error(`获取当前 Session 失败：HTTP ${response.status}`)
  }

  const responseBody = (await response.json()) as GetSessionResponse

  return responseBody.user
}

export async function fetchDevelopmentUsers(): Promise<PublicUserDto[]> {
  const response = await fetch('/api/dev/users', {
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(`获取开发账号列表失败：HTTP ${response.status}`)
  }

  const responseBody = (await response.json()) as ListDevelopmentUsersResponse

  return responseBody.users
}

export async function createDevelopmentSession(uid: number): Promise<void> {
  const requestBody = {
    uid,
  } satisfies CreateDevelopmentSessionRequest

  const response = await fetch('/api/dev/session', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (response.status !== 204) {
    throw new Error(`创建开发 Session 失败：HTTP ${response.status}`)
  }
}
