import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path)
  try {
    db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;')
    db.exec('BEGIN IMMEDIATE')
    try {
      let version = db.prepare('PRAGMA user_version').get().user_version
      if (version > 3) throw new Error('La base de datos pertenece a una versión más reciente.')
      if (version < 1) { db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')); version = 1 }
      if (version < 2) { db.exec(readFileSync(new URL('./migrations/002-reminders.sql', import.meta.url), 'utf8')); version = 2 }
      if (version < 3) db.exec(readFileSync(new URL('./migrations/003-statistics-goals.sql', import.meta.url), 'utf8'))
      db.exec('COMMIT')
    } catch (error) { db.exec('ROLLBACK'); throw error }
    return db
  } catch (error) { db.close(); throw error }
}
