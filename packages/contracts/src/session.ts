import type { PublicUserDto } from './user.js'

export type GetSessionResponse = {
  user: PublicUserDto
}

export type ListDevelopmentUsersResponse = {
  users: PublicUserDto[]
}

export type CreateDevelopmentSessionRequest = {
  uid: number
}
