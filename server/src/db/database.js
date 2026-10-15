import {randomUUID} from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync, chmodSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(path)
  try {
    if (path !== ':memory:') for (const file of [path,path+'-wal',path+'-shm']) if (existsSync(file)) chmodSync(file,0o600)
    db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;')
    // Solo esta conexión de migración suspende FKs para ALTER con DEFAULT no nulo.
    // Comprobamos todas las relaciones antes del COMMIT y reactivamos al terminar.
    if(db.prepare('PRAGMA user_version').get().user_version<7)db.exec('PRAGMA foreign_keys=OFF')
    db.exec('BEGIN IMMEDIATE')
    try {
      let version = db.prepare('PRAGMA user_version').get().user_version
      if (version > 7) throw new Error('La base de datos pertenece a una versión más reciente.')
      if (version < 1) { db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8')); version = 1 }
      if (version < 2) { db.exec(readFileSync(new URL('./migrations/002-reminders.sql', import.meta.url), 'utf8')); version = 2 }
      if (version < 3) { db.exec(readFileSync(new URL('./migrations/003-statistics-goals.sql', import.meta.url), 'utf8')); version = 3 }
      if (version < 4) { db.exec(readFileSync(new URL('./migrations/004-assistant.sql', import.meta.url), 'utf8')); version = 4 }
      if (version < 5) { db.exec(readFileSync(new URL('./migrations/005-security.sql', import.meta.url), 'utf8')); version = 5 }
      if (version < 6) { db.exec(readFileSync(new URL('./migrations/006-academic.sql', import.meta.url), 'utf8')); version=6 }
      if (version < 7) {
        db.exec(readFileSync(new URL('./migrations/007-platform.sql', import.meta.url), 'utf8'))
        for(const session of db.prepare("SELECT * FROM class_sessions WHERE length(trim(docente))>0").all()){
          const name=session.docente.trim()
          if(name.length>120||/[,;\\/\\n]/.test(name))continue
          const key=name.normalize('NFKC').toLocaleLowerCase('es-PE')
          const old=db.prepare('SELECT id FROM teachers WHERE userId=? AND nombreKey=?').get(session.userId,key)
          const id=old?.id||randomUUID()
          if(!old)db.prepare('INSERT INTO teachers(id,userId,nombre,nombreKey,createdAt,updatedAt) VALUES(?,?,?,?,?,?)').run(id,session.userId,name,key,session.createdAt,session.updatedAt)
          db.prepare('UPDATE class_sessions SET teacherId=? WHERE id=?').run(id,session.id)
        }
      }
      if(db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('La migración contiene relaciones inválidas.')
      db.exec('COMMIT')
      db.exec('PRAGMA foreign_keys=ON')
    } catch (error) { db.exec('ROLLBACK'); throw error }
    return db
  } catch (error) { db.close(); throw error }
}
