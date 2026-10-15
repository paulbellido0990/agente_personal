import { getConfig } from './config.js'
import { openDatabase } from './db/database.js'
import { createApp } from './app.js'
try {
  const config = getConfig()
  const db = openDatabase(config.dbPath)
  const server = createApp({ db, origin: config.origin }).listen(config.port, config.host, () => {
    console.log('ALIRA API: http://' + config.host + ':' + config.port)
    console.log('SQLite: ' + config.dbPath)
  })
  server.on('error', error => { console.error('No se pudo iniciar ALIRA:', error.code || error.name); db.close(); process.exitCode = 1 })
  const stop = () => server.close(() => { db.close(); process.exit(0) })
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
} catch (error) { console.error('No se pudo iniciar ALIRA:', error.message); process.exitCode = 1 }
