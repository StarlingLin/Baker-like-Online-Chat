import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

export type DatabaseClientOptions = {
  databaseUrl: string
  onPoolError: (error: Error) => void
}

export function createDatabaseClient(options: DatabaseClientOptions) {
  const pool = new Pool({
    connectionString: options.databaseUrl,
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  })

  pool.on('error', options.onPoolError)

  const db = drizzle({ client: pool })

  return {
    db,

    async checkConnection(): Promise<void> {
      await pool.query('SELECT 1')
    },

    async close(): Promise<void> {
      await pool.end()
    },
  }
}

export type DatabaseClient = ReturnType<typeof createDatabaseClient>
