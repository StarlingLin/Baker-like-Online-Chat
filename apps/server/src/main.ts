import { buildApp } from './app.js'

const host = '127.0.0.1'
const port = 3000

const app = buildApp({ logger: true })

try {
  await app.listen({ host, port })
} catch (error) {
  app.log.error(error)
  process.exitCode = 1
}
