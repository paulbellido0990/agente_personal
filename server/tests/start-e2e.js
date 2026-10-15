import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
// Base de pruebas aislada; no abre los datos personales.
process.env.DB_PATH=join(mkdtempSync(join(tmpdir(),'alira-e2e-')),'browser.db')
process.env.PORT=process.env.ALIRA_TEST_PORT || '3011'
process.env.FRONTEND_ORIGIN=process.env.ALIRA_TEST_ORIGIN || 'http://127.0.0.1:5174'
await import('../src/index.js')
