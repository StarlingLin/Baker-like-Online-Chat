import { buildApp } from './app.js'
import { loadConfig } from './config.js'

const host = '127.0.0.1'
const port = 3000

const config = loadConfig()

const app = buildApp({
  databaseUrl: config.databaseUrl,
  serverOptions: {
    logger: true,
  },
})

try {
  await app.listen({ host, port })
} catch (error) {
  app.log.error(error)
  await app.close()
  process.exitCode = 1
}
