export const statusLabels = { pendiente: 'Pendiente', en_progreso: 'En progreso', completada: 'Completada' }
export const priorityLabels = { alta: 'Alta', media: 'Media', baja: 'Baja' }
const owns = (object, key) => Object.hasOwn(object, key)
export function localDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = type => parts.find(p => p.type === type).value
  return get('year') + '-' + get('month') + '-' + get('day')
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return false
  const date = new Date(value + 'T12:00:00Z')
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function addDays(day, amount) {
  const date = new Date(day + 'T12:00:00Z')
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}
export function formatDate(day) {
  if (!validDate(day)) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Lima' }).format(new Date(day + 'T12:00:00-05:00'))
}
export function validateTask(input) {
  const errors = {}
  if (typeof input.titulo !== 'string' || input.titulo.trim().length < 3 || input.titulo.trim().length > 120) errors.titulo = 'Escribe un título de 3 a 120 caracteres.'
  if (input.descripcion != null && (typeof input.descripcion !== 'string' || input.descripcion.length > 5000)) errors.descripcion = 'La descripción admite hasta 5000 caracteres.'
  if (input.categoria != null && (typeof input.categoria !== 'string' || input.categoria.trim().length > 80)) errors.categoria = 'La categoría admite hasta 80 caracteres.'
  if (!owns(priorityLabels, input.prioridad)) errors.prioridad = 'Selecciona una prioridad válida.'
  if (!owns(statusLabels, input.estado)) errors.estado = 'Selecciona un estado válido.'
  if (input.fechaLimite !== undefined && input.fechaLimite !== null && input.fechaLimite !== '' && !validDate(input.fechaLimite)) errors.fechaLimite = 'Indica una fecha válida.'
  return errors
}
export function buildTask(input, previous = null, now = new Date().toISOString()) {
  if (Object.keys(validateTask(input)).length) throw new Error('Revisa los campos de la tarea.')
  return {
    id: previous?.id ?? crypto.randomUUID(),
    titulo: input.titulo.trim(), descripcion: input.descripcion?.trim() ?? '',
    categoria: input.categoria?.trim() || 'Sin categoría',
    prioridad: input.prioridad, estado: input.estado, fechaLimite: input.fechaLimite || null,
    createdAt: previous?.createdAt ?? now, updatedAt: now,
  }
}
export function normalizeTasks(records) {
  if (!Array.isArray(records)) throw new Error('Formato de almacenamiento no válido.')
  const seen = new Set()
  const result = []
  for (const record of records) {
    if (!record || typeof record !== 'object' || typeof record.id !== 'string' || !record.id.trim() || seen.has(record.id) || typeof record.titulo !== 'string' || record.titulo.trim().length < 3 || record.titulo.trim().length > 120) continue
    const stamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '1970-01-01T00:00:00.000Z'
    result.push({
      id: record.id, titulo: record.titulo.trim(),
      descripcion: typeof record.descripcion === 'string' ? record.descripcion.slice(0, 5000) : '',
      categoria: typeof record.categoria === 'string' && record.categoria.trim() ? record.categoria.trim().slice(0, 80) : 'Sin categoría',
      prioridad: owns(priorityLabels, record.prioridad) ? record.prioridad : 'media',
      estado: owns(statusLabels, record.estado) ? record.estado : 'pendiente',
      fechaLimite: validDate(record.fechaLimite) ? record.fechaLimite : null,
      createdAt: stamp(record.createdAt), updatedAt: stamp(record.updatedAt),
    })
    seen.add(record.id)
  }
  return result
}
export function summarize(tasks, today) {
  const completadas = tasks.filter(t => t.estado === 'completada').length
  return {
    total: tasks.length, completadas, pendientes: tasks.length - completadas,
    proximas: tasks.filter(t => t.estado !== 'completada' && t.fechaLimite >= today && t.fechaLimite <= addDays(today, 3)).length,
    vencidas: tasks.filter(t => t.estado !== 'completada' && t.fechaLimite && t.fechaLimite < today).length,
    percent: tasks.length ? Math.round(completadas / tasks.length * 100) : 0,
  }
}
export function selectTasks(tasks, { query = '', status = '', priority = '', category = '', sort = 'fechaLimite', descending = false } = {}) {
  const search = query.trim().toLocaleLowerCase('es-PE')
  const ranks = { alta: 0, media: 1, baja: 2 }
  return tasks.filter(t => (t.titulo + ' ' + t.descripcion).toLocaleLowerCase('es-PE').includes(search) && (!status || t.estado === status) && (!priority || t.prioridad === priority) && (!category || t.categoria === category)).sort((a, b) => {
    // Las tareas sin fecha siempre van al final, en ambas direcciones.
    if (sort === 'fechaLimite' && (!a.fechaLimite || !b.fechaLimite)) return a.fechaLimite ? -1 : b.fechaLimite ? 1 : a.id.localeCompare(b.id)
    const comparison = sort === 'prioridad' ? ranks[a.prioridad] - ranks[b.prioridad] : String(a[sort]).localeCompare(String(b[sort]))
    return (descending ? -comparison : comparison) || a.id.localeCompare(b.id)
  })
}
