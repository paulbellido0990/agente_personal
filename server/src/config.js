import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
const root = fileURLToPath(new URL('../', import.meta.url))
export function getConfig(env = process.env) {
  const port = Number(env.PORT || 3001)
  const origin = env.FRONTEND_ORIGIN || 'http://localhost:5173'
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT debe ser un puerto válido.')
  if (new URL(origin).origin !== origin) throw new Error('FRONTEND_ORIGIN debe ser un origen HTTP sin ruta ni barra final.')
  if (!/^https?:/.test(origin)) throw new Error('FRONTEND_ORIGIN debe usar HTTP o HTTPS.')
  return { host: env.HOST || '127.0.0.1', port, origin, dbPath: resolve(root, env.DB_PATH || './data/alira.db') }
}
