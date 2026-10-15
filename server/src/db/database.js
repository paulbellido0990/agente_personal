import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  try {
    db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;')
    const version = db.prepare('PRAGMA user_version').get().user_version
    if (version > 1) throw new Error('La base de datos pertenece a una versión más reciente.')
    db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'))
    return db
  } catch (error) { db.close(); throw error }
}
