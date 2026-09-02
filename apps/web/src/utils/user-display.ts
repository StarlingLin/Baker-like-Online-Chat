import type { PublicUserDto } from '@baker-chat/contracts'

export function formatUid(uid: number): string {
  return uid.toString().padStart(8, '0')
}

export function formatDiscriminator(discriminator: number): string {
  return discriminator.toString().padStart(4, '0')
}

export function formatUserDisplayName(user: PublicUserDto): string {
  return `${user.nickname} #${formatDiscriminator(user.discriminator)}`
}
