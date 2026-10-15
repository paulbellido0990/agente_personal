import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// Base efímera independiente. Nunca abre server/data/alira.db.
process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), 'alira-e2e-')), 'browser.db')
process.env.PORT = '3011'
process.env.FRONTEND_ORIGIN = 'http://127.0.0.1:5174'
await import('../src/index.js')
