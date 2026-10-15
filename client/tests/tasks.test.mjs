import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTask, validateTask, normalizeTasks, selectTasks, summarize, localDay, validDate, addDays } from '../src/services/tasks.js'
import { createTaskStorage, TASKS_KEY } from '../src/services/taskStorage.js'
const input = { titulo: 'Preparar informe', descripcion: 'Revisar fuentes', categoria: 'Estudio', prioridad: 'alta', estado: 'pendiente', fechaLimite: '2026-10-15' }
const now = '2026-10-14T18:00:00.000Z'
const make = (extra = {}) => buildTask({ ...input, ...extra }, null, now)
function memory() {
  const entries = new Map()
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), entries }
}
test('valida título, enumeraciones y fechas imposibles', () => {
  assert.ok(validateTask({ ...input, titulo: '  a ' }).titulo)
  assert.ok(validateTask({ ...input, titulo: 'x'.repeat(121) }).titulo)
  assert.ok(validateTask({ ...input, prioridad: 'urgente', estado: 'hecha', fechaLimite: '2026-02-30' }).fechaLimite)
  assert.equal(validDate('2024-02-29'), true)
  assert.equal(validDate('2026-02-29'), false)
  assert.equal(validDate('2026-2-01'), false)
  assert.equal(validDate('0000-01-01'), false)
})
test('crear y editar conserva ID y fecha de creación, normaliza campos', () => {
  const task = make()
  const changed = buildTask({ ...task, titulo: '  Nuevo título  ', descripcion: '', categoria: '', fechaLimite: '', estado: 'completada', prioridad: 'baja' }, task, '2026-10-15T18:00:00.000Z')
  assert.equal(changed.id, task.id)
  assert.equal(changed.createdAt, now)
  assert.equal(changed.updatedAt, '2026-10-15T18:00:00.000Z')
  assert.equal(changed.titulo, 'Nuevo título')
  assert.equal(changed.categoria, 'Sin categoría')
  assert.equal(changed.fechaLimite, null)
  assert.notEqual(make().id, task.id)
})
test('usa el día de Lima aunque UTC ya cambió de fecha', () => {
  assert.equal(localDay(new Date('2026-10-15T02:00:00Z')), '2026-10-14')
  assert.equal(addDays('2026-12-30', 3), '2027-01-02')
})
test('contadores, vencidas y progreso excluyen completadas de entregas', () => {
  const tasks = [make(), make({ estado: 'completada', fechaLimite: '2026-10-13' }), make({ fechaLimite: '2026-10-13' }), make({ fechaLimite: null })]
  assert.deepEqual(summarize(tasks, '2026-10-14'), { total: 4, completadas: 1, pendientes: 3, proximas: 1, vencidas: 1, percent: 25 })
  assert.equal(summarize([], '2026-10-14').percent, 0)
})
test('combina búsqueda por descripción y tres filtros sin mutar datos', () => {
  const tasks = [make(), make({ estado: 'completada' }), make({ categoria: 'Personal' })]
  assert.equal(selectTasks(tasks, { query: ' FUENTES ', status: 'pendiente', priority: 'alta', category: 'Estudio' }).length, 1)
  assert.equal(selectTasks(tasks, { query: 'no existe' }).length, 0)
  assert.equal(tasks.length, 3)
})
test('ordena por fecha, prioridad y creación en ambas direcciones; sin fecha al final', () => {
  const a = make({ fechaLimite: null, prioridad: 'baja' })
  const b = make({ fechaLimite: '2026-10-17' })
  const c = { ...make({ fechaLimite: '2026-10-15', prioridad: 'media' }), createdAt: '2026-10-13T12:00:00.000Z' }
  assert.deepEqual(selectTasks([a,b,c]).map(t => t.id), [c.id,b.id,a.id])
  assert.deepEqual(selectTasks([a,b,c], { descending: true }).map(t => t.id), [b.id,c.id,a.id])
  assert.deepEqual(selectTasks([a,b,c], { sort: 'prioridad' }).map(t => t.id), [b.id,c.id,a.id])
  assert.equal(selectTasks([a,b,c], { sort: 'prioridad', descending: true })[0].id, a.id)
  assert.equal(selectTasks([a,b,c], { sort: 'createdAt' })[0].id, c.id)
})
test('normaliza registros incompletos, duplicados e inválidos sin lanzar', () => {
  const tasks = normalizeTasks([null, {}, { id: 'ok', titulo: 'Recuperada', estado: 'incorrecto', fechaLimite: '2026-02-30' }, { id: 'ok', titulo: 'Duplicada' }])
  assert.equal(tasks.length, 1)
  assert.equal(tasks[0].estado, 'pendiente')
  assert.equal(tasks[0].fechaLimite, null)
  assert.equal(tasks[0].descripcion, '')
})
test('flujo persistente crear, editar, completar, recargar y eliminar hasta vacío', () => {
  const storage = memory()
  const repo = createTaskStorage(() => storage)
  const task = make()
  repo.save([task])
  const updated = buildTask({ ...task, titulo: 'Informe final', estado: 'completada' }, task)
  repo.save([updated])
  assert.equal(createTaskStorage(() => storage).read().tasks[0].titulo, 'Informe final')
  assert.equal(repo.read().tasks[0].estado, 'completada')
  repo.save([])
  assert.deepEqual(createTaskStorage(() => storage).read().tasks, [])
})
test('JSON corrupto se conserva y se respalda antes de guardar recuperación', () => {
  const storage = memory()
  storage.setItem(TASKS_KEY, '{corrupto')
  const repo = createTaskStorage(() => storage)
  assert.ok(repo.read().warning)
  assert.equal(storage.getItem(TASKS_KEY), '{corrupto')
  repo.save([make()])
  assert.ok([...storage.entries].some(([k,v]) => k.startsWith(TASKS_KEY + '.backup.') && v === '{corrupto'))
  assert.equal(repo.read().tasks.length, 1)
})
test('almacenamiento bloqueado y cuota agotada no anuncian guardado', () => {
  const repo = createTaskStorage(() => { throw new Error('bloqueado') })
  assert.ok(repo.read().warning)
  assert.throws(() => repo.save([]))
  const storage = memory()
  storage.setItem(TASKS_KEY, JSON.stringify([make()]))
  const before = storage.getItem(TASKS_KEY)
  storage.setItem = () => { throw new Error('cuota') }
  assert.throws(() => createTaskStorage(() => storage).save([]))
  assert.equal(storage.getItem(TASKS_KEY), before)
})
