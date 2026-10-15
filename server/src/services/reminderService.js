import { randomUUID } from 'node:crypto'
import { localDay } from '../../../shared/tasks.js'
import { reminderDate } from '../../../shared/calendar.js'
import { HttpError } from '../errors.js'
export function createReminderService(db, now = () => new Date()) {
  const active = ` FROM reminder_events e JOIN tasks t ON t.id=e.taskId
    WHERE t.estado != 'completada' AND t.fechaLimite=e.fechaLimite AND t.recordatorio=e.daysBefore AND e.triggerDate <= ?`
  function generate() {
    const current = now()
    const today = localDay(current)
    const insert = db.prepare('INSERT INTO reminder_events (id,taskId,fechaLimite,daysBefore,triggerDate,createdAt) VALUES (?,?,?,?,?,?) ON CONFLICT(taskId,fechaLimite,daysBefore) DO NOTHING')
    db.exec('BEGIN IMMEDIATE')
    try {
      for (const task of db.prepare("SELECT * FROM tasks WHERE estado != 'completada' AND recordatorio IS NOT NULL AND fechaLimite IS NOT NULL").all()) {
        const day = reminderDate(task)
        if (day && day <= today) insert.run(randomUUID(),task.id,task.fechaLimite,task.recordatorio,day,current.toISOString())
      }
      db.exec('COMMIT')
    } catch (error) { db.exec('ROLLBACK'); throw error }
    return today
  }
  function event(id) {
    const today = generate()
    const result = db.prepare('SELECT e.*' + active + ' AND e.id=?').get(today, id)
    if (!result) throw new HttpError(404, 'El recordatorio ya no está disponible.')
    return result
  }
  return {
    list() {
      const today = generate()
      return db.prepare('SELECT e.*,t.titulo,t.prioridad' + active + ' ORDER BY e.triggerDate DESC,e.id').all(today)
    },
    read(id) {
      event(id)
      db.prepare('UPDATE reminder_events SET readAt=COALESCE(readAt,?) WHERE id=?').run(now().toISOString(),id)
      return { id, read: true }
    },
    claim(id) {
      event(id)
      const changed = db.prepare('UPDATE reminder_events SET notifiedAt=? WHERE id=? AND notifiedAt IS NULL AND readAt IS NULL').run(now().toISOString(),id).changes
      return { claimed: changed === 1 }
    },
  }
}
