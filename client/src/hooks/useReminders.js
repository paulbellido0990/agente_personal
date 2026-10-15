import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { taskApi } from '../services/taskApi'
import { requestBrowserNotifications, notifyOnce } from '../services/browserNotifications'
export default function useReminders({ demo, tasks, connected }) {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [browserEnabled, setBrowserEnabled] = useState(false)
  const [browserError, setBrowserError] = useState('')
  const queued = useRef(false)
  const running = useRef(false)
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  const refresh = useCallback(async function check() {
    if (demo || !active.current) return
    if (running.current) { queued.current = true; return }
    running.current = true
    try {
      const result = await taskApi.notifications()
      if (active.current) { setEvents(result); setError(''); setLoading(false) }
    } catch (failure) {
      if (active.current) { setError(failure.message); setLoading(false) }
    } finally {
      running.current = false
      if (queued.current && active.current) { queued.current = false; queueMicrotask(check) }
    }
  }, [demo])
  useEffect(() => {
    let cancelled = false
    // La microtarea evita cambios de estado síncronos durante el montaje.
    Promise.resolve().then(() => { if (!cancelled) refresh() })
    const timer = setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    const visible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', visible)
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('focus',refresh); document.removeEventListener('visibilitychange',visible) }
  }, [refresh, tasks])
  const activeEvents = useMemo(() => demo ? [] : events.filter(event => event.type && event.type !== 'recordatorio' || event.sessionId || tasks.some(task => task.id === event.taskId && task.estado !== 'completada' && task.fechaLimite === event.fechaLimite && task.recordatorio === event.daysBefore)), [demo,events,tasks])
  useEffect(() => {
    if (!browserEnabled || demo || !connected) return
    let cancelled = false
    async function deliver() {
      for (const event of activeEvents.filter(e => (!e.type || e.type === 'recordatorio') && !e.readAt && !e.notifiedAt)) {
        if (cancelled) break
        try { await notifyOnce(event,taskApi) } catch { if (!cancelled) setBrowserError('No se pudo mostrar una notificación. El aviso sigue dentro de ALIRA.') }
      }
    }
    deliver()
    return () => { cancelled = true }
  }, [activeEvents,browserEnabled,demo,connected])
  async function toggleBrowser() {
    if (browserEnabled) { setBrowserEnabled(false); return }
    try { await requestBrowserNotifications(); setBrowserEnabled(true); setBrowserError('') }
    catch (failure) { setBrowserError(failure.message) }
  }
  async function markRead(id) {
    if (!connected) { setError("Reconecta con el backend para marcar avisos."); return }
    try {
      const event=events.find(e=>e.id===id)
      if(!event)return
      await taskApi.readNotification(event)
      setEvents(current => current.map(e => e.id === id ? { ...e, readAt: new Date().toISOString() } : e))
    } catch (failure) { setError(failure.message) }
  }
  return { events: activeEvents, error, loading, refresh, markRead, browserEnabled, browserError, toggleBrowser }
}
