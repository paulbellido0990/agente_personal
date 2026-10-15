import { DatabaseSync } from 'node:sqlite'
import { getConfig } from '../src/config.js'
const config = getConfig()
try {
  const db = new DatabaseSync(config.dbPath, { readOnly: true })
  console.log('Base: ' + config.dbPath)
  console.table(db.prepare('SELECT id,titulo,categoria,prioridad,estado,fechaLimite,createdAt,updatedAt FROM tasks ORDER BY createdAt DESC').all())
  db.close()
} catch { console.error('No se pudo leer la base. Inicia el backend primero.'); process.exitCode = 1 }
