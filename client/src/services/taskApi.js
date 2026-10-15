const defaultUrl = 'http://127.0.0.1:3001/api'
export function createTaskApi(baseUrl = defaultUrl, fetcher = globalThis.fetch) {
  const base = baseUrl.replace(/\/+$/, '')
  async function request(path, { method = 'GET', body, signal, responseType } = {}) {
    try {
      const response = await fetcher(base + path, {
        method, signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000), headers: body ? { 'Content-Type': 'application/json' } : {},
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (response.status === 204) return null
      if (response.ok && responseType === 'blob') return response.blob()
      let json
      try { json = await response.json() } catch { throw new Error('La API no devolvió JSON válido. Revisa la dirección configurada.') }
      if (!response.ok) throw new Error(json.error?.message || 'El servidor rechazó la operación.')
      if (!Object.hasOwn(json, 'data')) throw new Error('La respuesta del servidor no tiene el formato esperado.')
      return json.data
    } catch (error) {
      if (error.name === 'AbortError') throw error
      if (error instanceof TypeError || error.name === 'TimeoutError') throw new Error('No se pudo confirmar la operación. Comprueba que el backend esté iniciado y revisa la conexión; actualiza el listado antes de reintentar.')
      throw error
    }
  }
  return {
    statistics: (range,signal) => request('/statistics?' + new URLSearchParams(range),{signal}),
    goals: signal => request('/goals',{signal}),
    createGoal: body => request('/goals',{method:'POST',body}),
    updateGoal: (id,body) => request('/goals/' + encodeURIComponent(id),{method:'PUT',body}),
    toggleGoal: (id,activa) => request('/goals/' + encodeURIComponent(id) + '/active',{method:'PATCH',body:{activa}}),
    downloadReport: (range,revision,format) => request('/statistics/export.' + (format === 'csv' ? 'csv' : 'pdf') + '?' + new URLSearchParams({...range,revision}),{responseType:'blob'}),
    reminders: () => request('/reminders'),
    readReminder: id => request('/reminders/' + encodeURIComponent(id) + '/read', { method: 'PATCH', body: {} }),
    claimReminder: id => request('/reminders/' + encodeURIComponent(id) + '/claim', { method: 'POST', body: {} }),
    list: signal => request('/tasks', { signal }),
    create: (task, id) => request('/tasks', { method: 'POST', body: { ...task, id } }),
    update: (id, task) => request('/tasks/' + encodeURIComponent(id), { method: 'PUT', body: task }),
    status: (id, estado) => request('/tasks/' + encodeURIComponent(id) + '/status', { method: 'PATCH', body: { estado } }),
    remove: id => request('/tasks/' + encodeURIComponent(id), { method: 'DELETE' }),
    importTasks: tasks => request('/tasks/import', { method: 'POST', body: { tasks } }),
  }
}
export const taskApi = createTaskApi(import.meta.env?.VITE_API_URL || defaultUrl)
export function taskPayload(input) {
  return { titulo: input.titulo, descripcion: input.descripcion, categoria: input.categoria, prioridad: input.prioridad, estado: input.estado, fechaLimite: input.fechaLimite || null, recordatorio: input.recordatorio ?? null }
}
export async function importInBatches(api, tasks) {
  let imported = 0, skipped = 0
  try {
    const batches = []
    let batch = [], bytes = 0
    const encoder = new TextEncoder()
    for (const task of tasks) {
      const size = encoder.encode(JSON.stringify(task)).byteLength + 1
      if (batch.length && (batch.length === 100 || bytes + size > 750000)) {
        batches.push(batch); batch = []; bytes = 0
      }
      batch.push(task); bytes += size
    }
    if (batch.length) batches.push(batch)
    for (const group of batches) {
      const result = await api.importTasks(group)
      imported += result.imported
      skipped += result.skipped
    }
    return { imported, skipped }
  } catch (error) {
    throw new Error(error.message + ' Confirmadas en lotes anteriores: ' + imported + ' importadas y ' + skipped + ' existentes. Los datos locales se conservan; puedes reintentar.', { cause: error })
  }
}
