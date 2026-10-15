import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calendarDays, shiftDate, planTasks, reminderDate } from '../../shared/calendar.js'
import { buildTask, localDay, validateTask } from '../../shared/tasks.js'
import { notifyOnce } from '../src/services/browserNotifications.js'
const task = extra => buildTask({ titulo: 'Actividad', descripcion: '', categoria: 'Estudio', prioridad: 'media', estado: 'pendiente', fechaLimite: '2026-10-14', ...extra })
test('mes, semana y día respetan lunes y días calendario locales', () => {
  const month = calendarDays('2026-10-14')
  assert.equal(month[0], '2026-09-28')
  assert.equal(month.at(-1), '2026-11-01')
  assert.equal(month.length, 35)
  assert.deepEqual(calendarDays('2026-10-14','week'), ['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16','2026-10-17','2026-10-18'])
  assert.deepEqual(calendarDays('2026-10-14','day'), ['2026-10-14'])
})
test('navegación de meses, años bisiestos y límites sin UTC accidental', () => {
  assert.equal(shiftDate('2024-01-31','month',1), '2024-02-29')
  assert.equal(shiftDate('2026-01-31','month',1), '2026-02-28')
  assert.equal(shiftDate('2026-12-14','month',1), '2027-01-14')
  assert.equal(shiftDate('2026-12-29','week',1), '2027-01-05')
  assert.equal(shiftDate('2024-02-28','day',1), '2024-02-29')
  assert.equal(shiftDate('9999-12-31','month',1), '9999-12-31')
  assert.ok(calendarDays('0001-01-01').filter(Boolean).every(d => d >= '0001-01-01'))
  assert.equal(localDay(new Date('2026-10-15T04:59:00Z')), '2026-10-14')
})
test('planificación separa hoy, mañana, siete días, vencidas, sin fecha y completadas', () => {
  const tasks = [task({}),task({fechaLimite:'2026-10-15'}),task({fechaLimite:'2026-10-20',prioridad:'alta'}),task({fechaLimite:'2026-10-21'}),task({fechaLimite:'2026-10-13'}),task({fechaLimite:null}),task({estado:'completada'})]
  for (const [period,count] of [['hoy',1],['manana',1],['semana',3],['vencidas',1],['sin_fecha',1],['completadas',1]]) assert.equal(planTasks(tasks,period,'2026-10-14').length,count)
  assert.equal(planTasks(tasks,'semana','2026-10-14','prioridad')[0].prioridad,'alta')
  assert.equal(tasks.length,7)
})
test('recordatorios válidos, desactivados y cambio de año', () => {
  assert.equal(reminderDate(task({recordatorio:0})), '2026-10-14')
  assert.equal(reminderDate(task({fechaLimite:'2027-01-02',recordatorio:3})), '2026-12-30')
  assert.equal(reminderDate(task({recordatorio:null})), null)
  assert.ok(validateTask({titulo:'Actividad',prioridad:'media',estado:'pendiente',fechaLimite:null,recordatorio:0}).recordatorio)
  assert.ok(validateTask({titulo:'Actividad',prioridad:'media',estado:'pendiente',fechaLimite:'2026-10-14',recordatorio:2}).recordatorio)
})
test('notificaciones requieren permiso y una reclamación única', async () => {
  let claims = 0, shown = 0
  const api = { claimReminder: async () => ({ claimed: ++claims === 1 }) }
  class Allowed { static permission = 'granted'; constructor() { shown++ } }
  class Denied { static permission = 'denied' }
  assert.equal(await notifyOnce({id:'evento'},api,Denied),false)
  assert.equal(claims,0)
  assert.equal(await notifyOnce({id:'evento',titulo:'Actividad',fechaLimite:'2026-10-14'},api,Allowed),true)
  assert.equal(await notifyOnce({id:'evento'},api,Allowed),false)
  assert.equal(shown,1)
})
