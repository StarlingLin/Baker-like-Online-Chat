import { createHash, randomBytes } from 'node:crypto'

const SESSION_TOKEN_BYTES = 32 /* 256位 */
export const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60 /* 一周 */
const SESSION_DURATION_MS = SESSION_DURATION_SECONDS * 1000

export type NewSessionMaterial = {
  token: string
  tokenHash: string
  expiresAt: Date
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function createSessionMaterial(now = new Date()): NewSessionMaterial {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString('base64url')

  return {
    token,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
  }
}
