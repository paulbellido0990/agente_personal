const defaultUrl = '/api'
export function createTaskApi(baseUrl = defaultUrl, fetcher = globalThis.fetch) {
  const base = baseUrl.replace(/\/+$/, '')
  let csrfToken = '',currentAccount=null
  const versions = new Map()
  const remember = (data, path) => {
    const kind = path.startsWith('/goals') ? 'goals' : path.startsWith('/tasks') ? 'tasks' : null
    if(kind) for(const item of Array.isArray(data) ? data : [data]) if(item?.id && item.version) versions.set(kind + '/' + item.id,item.version)
    return data
  }
  const match = (kind,id,version) => ({'If-Match':'"' + (version ?? versions.get(kind + '/' + id) ?? 0) + '"'})
  async function request(path, { method = 'GET', body, signal, responseType, timeoutMs = 15000, headers = {} } = {}) {
    try {
      const response = await fetcher(base + path, {
        method, credentials: 'include', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs), headers: { ...(body ? {'Content-Type':'application/json'} : {}), ...(!['GET','HEAD'].includes(method) ? {'X-CSRF-Token':csrfToken,'X-Alira-Request':'1'} : {}), ...headers },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (response.status === 204) return null
      if (response.ok && responseType === 'blob') return response.blob()
      let json
      try { json = await response.json() } catch { throw new Error('La API no devolvió JSON válido. Revisa la dirección configurada.') }
      if (!response.ok) {
        const error = new Error(json.error?.message || 'El servidor rechazó la operación.')
        error.status = response.status
        if(response.status === 401 && !path.startsWith('/auth/') && globalThis.window) window.dispatchEvent(new Event('alira-session-expired'))
        throw error
      }
      if (!Object.hasOwn(json, 'data')) throw new Error('La respuesta del servidor no tiene el formato esperado.')
      return remember(json.data,path)
    } catch (error) {
      if (error.name === 'AbortError') throw error
      if (error instanceof TypeError || error.name === 'TimeoutError') throw new Error('No se pudo confirmar la operación. Comprueba que el backend esté iniciado y revisa la conexión; actualiza el listado antes de reintentar.')
      throw error
    }
  }
  const acceptAuth=data=>{if(currentAccount!==(data.account?.id||null))versions.clear();currentAccount=data.account?.id||null;csrfToken=data.csrfToken||'';return data}
  return {
    platform: (path,options={}) => request(path,options),
    acceptInvitation: body => request('/auth/invitation',{method:'POST',body}),
    notifications: () => request('/notifications'),
    readNotification: event => request('/notifications/'+(event.type||'recordatorio')+'/'+encodeURIComponent(event.id)+'/read',{method:'PATCH',body:{}}),
    clearSession: () => {csrfToken='';currentAccount=null;versions.clear()},
    authSession: async signal => {const data=await request('/auth/session',{signal});return acceptAuth(data)},
    login: async body => {const data=await request('/auth/login',{method:'POST',body});return acceptAuth(data)},
    logout: async () => {await request('/auth/logout',{method:'POST',body:{}});csrfToken='';currentAccount=null;versions.clear()},
    changePassword: body => request('/auth/password',{method:'POST',body}),
    settings: () => request('/settings'),
    backup: currentPassword => request('/settings/backup',{method:'POST',body:{currentPassword},responseType:'blob',timeoutMs:60000}),
    academic: signal => request('/academic',{signal}),
    saveAcademic: (kind,body,record) => request('/academic/'+kind+(record?'/'+encodeURIComponent(record.id):''),{method:record?'PUT':'POST',body,headers:record?{'If-Match':'"'+record.version+'"'}:{}}),
    removeAcademic: (record,kind='sessions') => request('/academic/'+kind+'/'+encodeURIComponent(record.id),{method:'DELETE',headers:{'If-Match':'"'+record.version+'"'}}),
    removeSession: record => request('/academic/sessions/'+encodeURIComponent(record.id),{method:'DELETE',headers:{'If-Match':'"'+record.version+'"'}}),
    health: signal => request('/health', {signal}),
    statistics: (range,signal) => request('/statistics?' + new URLSearchParams(range),{signal}),
    goals: signal => request('/goals',{signal}),
    createGoal: body => request('/goals',{method:'POST',body}),
    updateGoal: (id,body,version) => request('/goals/' + encodeURIComponent(id),{method:'PUT',body,headers:match('goals',id,version)}),
    toggleGoal: (id,activa,version) => request('/goals/' + encodeURIComponent(id) + '/active',{method:'PATCH',body:{activa},headers:match('goals',id,version)}),
    downloadReport: (range,revision,format) => request('/statistics/export.' + (format === 'csv' ? 'csv' : 'pdf') + '?' + new URLSearchParams({...range,revision}),{responseType:'blob'}),
    reminders: () => request('/reminders'),
    readReminder: id => request('/reminders/' + encodeURIComponent(id) + '/read', { method: 'PATCH', body: {} }),
    claimReminder: id => request('/reminders/' + encodeURIComponent(id) + '/claim', { method: 'POST', body: {} }),
    list: signal => request('/tasks', { signal }),
    create: (task, id) => request('/tasks', { method: 'POST', body: { ...task, id } }),
    update: (id, task, version) => request('/tasks/' + encodeURIComponent(id), { method: 'PUT', body: task, headers:match('tasks',id,version) }),
    status: (id, estado, version) => request('/tasks/' + encodeURIComponent(id) + '/status', { method: 'PATCH', body: { estado }, headers:match('tasks',id,version) }),
    remove: (id,version) => request('/tasks/' + encodeURIComponent(id), { method: 'DELETE',headers:match('tasks',id,version) }),
    importTasks: tasks => request('/tasks/import', { method: 'POST', body: { tasks } }),
  }
}
export const taskApi = createTaskApi(import.meta.env?.VITE_API_URL || defaultUrl)
export function taskPayload(input) {
  return { titulo: input.titulo, descripcion: input.descripcion, categoria: input.categoria, prioridad: input.prioridad, estado: input.estado, fechaLimite: input.fechaLimite || null, recordatorio: input.recordatorio ?? null, ...(input.academic !== undefined ? {academic:input.academic} : {}) }
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
