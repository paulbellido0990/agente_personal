import { addDays, validDate, selectTasks } from './tasks.js'
export function dateAt(year, month, day = 1) {
  const date = new Date('2000-01-01T12:00:00Z')
  date.setUTCFullYear(year, month, day)
  return date
}
const asDay = date => {
  const year = date.getUTCFullYear()
  return year >= 1 && year <= 9999 ? date.toISOString().slice(0, 10) : null
}
export function shiftDate(day, view, amount) {
  const date = new Date(day + 'T12:00:00Z')
  if (view === 'month') {
    const target = dateAt(date.getUTCFullYear(), date.getUTCMonth() + amount)
    const last = dateAt(target.getUTCFullYear(), target.getUTCMonth() + 1, 0).getUTCDate()
    target.setUTCDate(Math.min(date.getUTCDate(), last))
    return asDay(target) || day
  }
  date.setUTCDate(date.getUTCDate() + (view === 'week' ? amount * 7 : amount))
  return asDay(date) || day
}
export function calendarDays(day, view = 'month') {
  const date = new Date(day + 'T12:00:00Z')
  if (view === 'day') return [day]
  const start = view === 'month' ? dateAt(date.getUTCFullYear(), date.getUTCMonth()) : date
  const offset = (start.getUTCDay() + 6) % 7
  const count = view === 'week' ? 7 : Math.ceil((offset + dateAt(date.getUTCFullYear(), date.getUTCMonth() + 1, 0).getUTCDate()) / 7) * 7
  start.setUTCDate(start.getUTCDate() - offset)
  return Array.from({ length: count }, (_, i) => {
    const item = new Date(start); item.setUTCDate(item.getUTCDate() + i)
    return asDay(item)
  })
}
export function monthLabel(day) {
  return new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(day + 'T12:00:00Z'))
}
export function planTasks(tasks, period, today, sort = 'fechaLimite') {
  const active = t => t.estado !== 'completada'
  const matches = {
    hoy: t => active(t) && t.fechaLimite === today,
    manana: t => active(t) && t.fechaLimite === addDays(today, 1),
    semana: t => active(t) && t.fechaLimite >= today && t.fechaLimite <= addDays(today, 6),
    vencidas: t => active(t) && t.fechaLimite && t.fechaLimite < today,
    sin_fecha: t => active(t) && !t.fechaLimite,
    completadas: t => t.estado === 'completada',
  }
  return selectTasks(tasks.filter(matches[period] || matches.hoy), { sort })
}
export const reminderLabels = { off: 'Desactivado', 0: 'El mismo día', 1: 'Un día antes', 3: 'Tres días antes' }
export function reminderDate(task) {
  if (task.recordatorio == null || !validDate(task.fechaLimite)) return null
  const result = addDays(task.fechaLimite, -task.recordatorio)
  return validDate(result) ? result : null
}
