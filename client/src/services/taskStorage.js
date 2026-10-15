import { normalizeTasks } from './tasks.js'
export const TASKS_KEY = 'alira.tasks.v1'
// Contrato síncrono de repositorio. Solo este módulo conoce localStorage.
export function createTaskStorage(getStorage = () => globalThis.localStorage) {
  function read() {
    try {
      const raw = getStorage().getItem(TASKS_KEY)
      if (raw === null) return { tasks: [], warning: '' }
      try {
        const parsed = JSON.parse(raw)
        const tasks = normalizeTasks(parsed)
        const changed = JSON.stringify(parsed) !== JSON.stringify(tasks)
        return { tasks, warning: changed ? 'Se recuperaron registros incompletos. El original se respaldará antes del próximo cambio.' : '' }
      } catch {
        return { tasks: [], warning: 'Los datos guardados están dañados. El original se respaldará antes del próximo cambio.' }
      }
    } catch {
      return { tasks: [], warning: 'No se pudo acceder al almacenamiento. No podrás guardar hasta habilitarlo.' }
    }
  }
  function save(tasks) {
    const storage = getStorage()
    const raw = storage.getItem(TASKS_KEY)
    if (raw !== null) {
      let damaged = false
      try { damaged = JSON.stringify(JSON.parse(raw)) !== JSON.stringify(normalizeTasks(JSON.parse(raw))) } catch { damaged = true }
      if (damaged) storage.setItem(TASKS_KEY + '.backup.' + crypto.randomUUID(), raw)
    }
    storage.setItem(TASKS_KEY, JSON.stringify(tasks))
  }
  return { read, save }
}
export const taskStorage = createTaskStorage()
