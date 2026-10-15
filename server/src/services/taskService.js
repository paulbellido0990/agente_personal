import { randomUUID } from 'node:crypto'
import { buildTask, validateTask, selectTasks, validDate, statusLabels, priorityLabels } from '../../../shared/tasks.js'
import { HttpError } from '../errors.js'
const editable = ['titulo','descripcion','categoria','prioridad','estado','fechaLimite','recordatorio']
const recordFields = [...editable, 'id','createdAt','updatedAt']
const same = (a, b) => editable.every(key => (a[key] ?? null) === (b[key] ?? null))
export function validId(id) {
  // Los IDs locales previos pueden no ser UUID; se preservan sin interpolarlos en SQL.
  return typeof id === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(id) && !id.startsWith('demo-')
}
function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Envía un objeto JSON.')
}
export function taskInput(body, importing = false) {
  object(body)
  const allowed = importing ? recordFields : [...editable, 'id']
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new HttpError(400, 'Hay campos no admitidos.')
  const errors = validateTask(body)
  if (body.fechaLimite !== undefined && body.fechaLimite !== null && body.fechaLimite !== '' && !validDate(body.fechaLimite)) errors.fechaLimite = 'Indica una fecha YYYY-MM-DD válida.'
  if (Object.keys(errors).length) throw new HttpError(400, 'Revisa los campos de la tarea.', errors)
  if (body.id !== undefined && !validId(body.id)) throw new HttpError(400, 'El identificador no es válido; los registros demo no se importan.')
  const task = buildTask(body)
  if (importing) {
    if (!validId(body.id)) throw new HttpError(400, 'Cada tarea importada necesita un identificador estable.')
    for (const key of ['createdAt', 'updatedAt']) {
      if (typeof body[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(body[key]) || !Number.isFinite(Date.parse(body[key])) || new Date(body[key]).toISOString() !== body[key]) throw new HttpError(400, 'Las fechas de creación y actualización deben ser ISO UTC.')
    }
    return { ...task, id: body.id, createdAt: body.createdAt, updatedAt: body.updatedAt }
  }
  return { ...task, id: body.id || randomUUID() }
}
export function createTaskService(repo) {
  function get(id) {
    if (!validId(id)) throw new HttpError(400, 'El identificador no es válido.')
    const task = repo.get(id)
    if (!task) throw new HttpError(404, 'No se encontró la tarea.')
    return task
  }
  return {
    get,
    list(query) {
      const allowed = ['q','estado','prioridad','categoria','sort','order','from','to']
      if (Object.keys(query).some(k => !allowed.includes(k)) || Object.values(query).some(v => typeof v !== 'string')) throw new HttpError(400, 'Filtros no válidos.')
      if (query.estado && !Object.hasOwn(statusLabels, query.estado) || query.prioridad && !Object.hasOwn(priorityLabels, query.prioridad) || query.sort && !['fechaLimite','prioridad','createdAt'].includes(query.sort) || query.order && !['asc','desc'].includes(query.order)) throw new HttpError(400, 'Estado, prioridad u orden no válido.')
      if (query.from && !validDate(query.from) || query.to && !validDate(query.to) || query.from && query.to && query.from > query.to) throw new HttpError(400, 'El rango de fechas no es válido.')
      return selectTasks(repo.list().filter(t => (!query.from || t.fechaLimite && t.fechaLimite >= query.from) && (!query.to || t.fechaLimite && t.fechaLimite <= query.to)), { query: query.q, status: query.estado, priority: query.prioridad, category: query.categoria, sort: query.sort, descending: query.order === 'desc' })
    },
    create(body) {
      const task = taskInput(body)
      const previous = repo.get(task.id)
      if (previous) {
        if (!same(previous, task)) throw new HttpError(409, 'Ese identificador ya pertenece a otra tarea.')
        return { task: previous, created: false }
      }
      return { task: repo.insert(task), created: true }
    },
    update(id, body) {
      const previous = get(id)
      if (body?.id !== undefined) throw new HttpError(400, 'No se puede modificar el identificador.')
      const input = taskInput({ ...body, recordatorio: body?.recordatorio === undefined ? (body?.fechaLimite ? previous.recordatorio : null) : body.recordatorio })
      return repo.update({ ...input, id, createdAt: previous.createdAt, updatedAt: new Date().toISOString() })
    },
    status(id, body) {
      object(body)
      if (Object.keys(body).length !== 1 || !Object.hasOwn(statusLabels, body.estado)) throw new HttpError(400, 'Envía únicamente un estado válido.')
      const previous = get(id)
      return repo.update({ ...previous, estado: body.estado, updatedAt: new Date().toISOString() })
    },
    remove(id) { get(id); repo.remove(id) },
    importTasks(body) {
      object(body)
      if (Object.keys(body).some(k => k !== 'tasks') || !Array.isArray(body.tasks) || body.tasks.length > 100) throw new HttpError(400, 'Envía un lote de hasta 100 tareas.')
      const tasks = body.tasks.map(t => taskInput(t, true))
      if (new Set(tasks.map(t => t.id)).size !== tasks.length) throw new HttpError(400, 'El lote contiene identificadores duplicados.')
      return repo.transaction(() => {
        let imported = 0, skipped = 0
        for (const task of tasks) {
          const previous = repo.get(task.id)
          // Nunca sobrescribir el registro del servidor, ni siquiera en un reintento.
          if (previous) {
            if (!same(previous, task)) throw new HttpError(409, 'Conflicto con una tarea ya guardada. No se importó este lote.', { id: task.id })
            skipped++
          } else { repo.insert(task, { imported: true }); imported++ }
        }
        return { imported, skipped }
      })
    },
  }
}
