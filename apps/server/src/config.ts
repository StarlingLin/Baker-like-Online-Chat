import { config as loadEnvironmentFile } from 'dotenv'

loadEnvironmentFile({ quiet: true })

export type AppConfig = {
  databaseUrl: string
}

export function loadConfig(): AppConfig {
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

  return { databaseUrl }
}
