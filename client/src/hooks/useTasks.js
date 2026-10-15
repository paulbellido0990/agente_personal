import { useCallback, useEffect, useRef, useState } from 'react'
import { taskStorage } from '../services/taskStorage'
import { taskApi, taskPayload, importInBatches } from '../services/taskApi'
import { buildTask } from '../services/tasks'
import { tasks as demoTasks } from '../data/demo'

export default function useTasks() {
  const [local] = useState(() => taskStorage.read())
  const [realTasks, setRealTasks] = useState([])
  const [demo, setDemo] = useState(false)
  const [examples, setExamples] = useState(() => demoTasks.map(t => ({ ...t, createdAt: '2026-10-14T15:00:00.000Z', updatedAt: '2026-10-14T15:00:00.000Z' })))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [connected, setConnected] = useState(false)
  const [notice, setNotice] = useState(null)
  const lock = useRef(false)
  const tasks = demo ? examples : realTasks
  const localTasks = local.tasks.filter(t => !t.id.startsWith('demo-'))

  useEffect(() => {
    const controller = new AbortController()
    taskApi.list(controller.signal).then(result => {
      if (!controller.signal.aborted) { setRealTasks(result); setConnected(true); setLoading(false) }
    }).catch(error => {
      if (!controller.signal.aborted) { setNotice({ type: 'error', text: error.message }); setLoading(false) }
    })
    return () => controller.abort()
  }, [])

  const reload = useCallback(async () => {
    if (lock.current) return false
    lock.current = true
    setLoading(true)
    try {
      setRealTasks(await taskApi.list())
      setConnected(true)
      setNotice({ type: 'success', text: 'Listado actualizado desde el servidor.' })
      return true
    } catch (error) {
      setConnected(false)
      setNotice({ type: 'error', text: error.message + ' Se mantiene la última lista recibida.' })
      return false
    } finally { setLoading(false); lock.current = false }
  }, [])

  async function perform(operation, message) {
    if (lock.current) return false
    lock.current = true
    setBusy(true)
    try {
      await operation()
      const text = typeof message === 'function' ? message() : message
      setNotice({ type: 'success', text: demo ? text + ' Solo en la demo; no se guarda.' : text })
      return true
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
      return false
    } finally { lock.current = false; setBusy(false) }
  }
  async function save(input, id, requestId) {
    return perform(async () => {
      const previous = id ? tasks.find(t => t.id === id) : null
      if (id && !previous) throw new Error('La tarea ya no está disponible.')
      const task = demo ? buildTask(input, previous) : id ? await taskApi.update(id, taskPayload(input)) : await taskApi.create(taskPayload(input), requestId)
      if (demo) setExamples(previous ? tasks.map(t => t.id === id ? task : t) : [...tasks, task])
      else { setRealTasks(current => id ? current.map(t => t.id === id ? task : t) : [...current.filter(t => t.id !== task.id), task]); setConnected(true) }
    }, id ? 'Tarea actualizada.' : 'Tarea creada.')
  }
  async function changeStatus(id, estado) {
    return perform(async () => {
      if (demo) setExamples(current => current.map(t => t.id === id ? buildTask({ ...t, estado }, t) : t))
      else { const task = await taskApi.status(id, estado); setRealTasks(current => current.map(t => t.id === id ? task : t)) }
    }, 'Estado actualizado.')
  }
  async function remove(id) {
    return perform(async () => {
      if (demo) setExamples(current => current.filter(t => t.id !== id))
      else { await taskApi.remove(id); setRealTasks(current => current.filter(t => t.id !== id)) }
    }, 'Tarea eliminada.')
  }
  async function importLocal() {
    let result
    return perform(async () => {
      result = await importInBatches(taskApi, localTasks)
      try {
        setRealTasks(await taskApi.list())
        setConnected(true)
      } catch (error) {
        throw new Error(result.imported + ' tareas importadas; ' + result.skipped + ' existentes. Actualiza el listado. ' + error.message, { cause: error })
      }
    }, () => result.imported + ' tareas importadas; ' + result.skipped + ' ya existentes. Se conservaron todos los datos locales.')
  }
  return {
    tasks, demo, loading, busy, connected, notice, localTasks,
    warning: local.warning ? 'Hay datos locales incompletos o inaccesibles. La importación solo incluye registros recuperables; no se modificará el original.' : '',
    excludedDemo: local.tasks.length - localTasks.length,
    save, changeStatus, remove, reload, importLocal,
    toggleDemo: () => { if (!lock.current) { setDemo(!demo); setNotice(null) } },
    dismissNotice: () => setNotice(null),
  }
}
