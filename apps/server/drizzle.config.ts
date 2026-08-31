import { config as loadEnvironmentFile } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

loadEnvironmentFile({ quiet: true })

const databaseUrl = process.env.DATABASE_URL?.trim()

if (!databaseUrl) {
  throw new Error('找不到 DATABASE_URL')
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: databaseUrl,
  },
})
