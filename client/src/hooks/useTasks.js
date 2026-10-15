import { useState } from 'react'
import { taskStorage } from '../services/taskStorage'
import { buildTask } from '../services/tasks'
import { tasks as demoTasks } from '../data/demo'
export default function useTasks() {
  const [initial] = useState(() => taskStorage.read())
  const [realTasks, setRealTasks] = useState(initial.tasks)
  const [demo, setDemo] = useState(false)
  const [examples, setExamples] = useState(() => demoTasks.map(t => ({ ...t, createdAt: '2026-10-14T15:00:00.000Z', updatedAt: '2026-10-14T15:00:00.000Z' })))
  const [warning, setWarning] = useState(initial.warning)
  const [notice, setNotice] = useState(null)
  const tasks = demo ? examples : realTasks
  function commit(next, message) {
    try {
      if (demo) setExamples(next)
      else { taskStorage.save(next); setRealTasks(next); setWarning('') }
      setNotice({ type: 'success', text: demo ? message + ' Solo en la demo; no se guarda.' : message })
      return true
    } catch {
      setNotice({ type: 'error', text: 'No se pudo guardar. No se aplicó el cambio. Revisa el espacio y los permisos del almacenamiento del navegador.' })
      return false
    }
  }
  function save(input, id) {
    const previous = id ? tasks.find(t => t.id === id) : null
    if (id && !previous) { setNotice({ type: 'error', text: 'La tarea ya no está disponible.' }); return false }
    try {
      const task = buildTask(input, previous)
      return commit(previous ? tasks.map(t => t.id === id ? task : t) : [...tasks, task], previous ? 'Tarea actualizada.' : 'Tarea creada.')
    } catch (error) { setNotice({ type: 'error', text: error.message }); return false }
  }
  function changeStatus(id, estado) {
    const task = tasks.find(t => t.id === id)
    return task ? save({ ...task, estado }, id) : false
  }
  return {
    tasks, demo, warning, notice, save, changeStatus,
    remove: id => commit(tasks.filter(t => t.id !== id), 'Tarea eliminada.'),
    toggleDemo: () => { setDemo(!demo); setNotice(null) },
    dismissNotice: () => setNotice(null),
  }
}
