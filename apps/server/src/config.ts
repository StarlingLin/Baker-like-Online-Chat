import { config as loadEnvironmentFile } from 'dotenv'

loadEnvironmentFile({ quiet: true })

export type AppEnvironment = 'development' | 'test' | 'production'

export type AppConfig = {
  appEnvironment: AppEnvironment
  databaseUrl: string
}

function parseAppEnvironment(value: string | undefined): AppEnvironment {
  const normalizedValue = value?.trim()

  if (!normalizedValue) {
    throw new Error('找不到 APP_ENV')
  }

  switch (normalizedValue) {
    case 'development':
    case 'test':
    case 'production':
      return normalizedValue

    default:
      throw new Error('APP_ENV 只允许 development、test 或 production')
  }
}

export function loadConfig(): AppConfig {
  const appEnvironment = parseAppEnvironment(process.env.APP_ENV)
  const databaseUrl = process.env.DATABASE_URL?.trim()

  if (!databaseUrl) {
    throw new Error('找不到 DATABASE_URL')
  }

  let parsedDatabaseUrl: URL

  try {
    parsedDatabaseUrl = new URL(databaseUrl)
  } catch {
    throw new Error('DATABASE_URL 不合法')
  }

  if (!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol)) {
    throw new Error('DATABASE_URL 需要使用 postgres 或 postgresql')
  }

  return {
    appEnvironment,
    databaseUrl,
  }
}
