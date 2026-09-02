export type UserRole = 'user' | 'admin'

export type PublicUserDto = {
  uid: number
  nickname: string
  discriminator: number
  role: UserRole
}
