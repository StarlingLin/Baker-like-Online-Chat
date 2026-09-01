import type { CookieSerializeOptions } from '@fastify/cookie'

import type { AppEnvironment } from '../config.js'
import { SESSION_DURATION_SECONDS } from './token.js'

export const SESSION_COOKIE_NAME = 'baker_session'

function createBaseSessionCookieOptions(appEnvironment: AppEnvironment): CookieSerializeOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: appEnvironment === 'production',
  }
}

export function createSessionCookieOptions(
  appEnvironment: AppEnvironment,
  expiresAt: Date,
): CookieSerializeOptions {
  return {
    ...createBaseSessionCookieOptions(appEnvironment),
    maxAge: SESSION_DURATION_SECONDS,
    expires: expiresAt,
  }
}

export function createSessionCookieRemovalOptions(
  appEnvironment: AppEnvironment,
): CookieSerializeOptions {
  return createBaseSessionCookieOptions(appEnvironment)
}
