import { useState } from 'react'
import { Bell } from 'lucide-react'
import { formatDate } from '../services/tasks'
export default function ReminderPanel({ reminders, demo, connected, onOpen }) {
  const [showRead, setShowRead] = useState(false)
  const displayed = reminders.events.filter(e => showRead || !e.readAt)
  return <section className="panel reminder-panel" id="recordatorios" tabIndex="-1" aria-labelledby="reminders-heading">
    <div className="panel-heading"><h2 id="reminders-heading"><Bell size={18} />Recordatorios</h2><button className="secondary-button" disabled={demo || !connected} onClick={reminders.refresh}>Actualizar avisos</button></div>
    <p className="calendar-subtitle">Se comprueban mientras ALIRA está abierta. Al volver se recuperan los pendientes. No hay avisos automáticos con la app cerrada.</p>
    {demo ? <p className="calendar-empty">Los recordatorios están desactivados en la demo.</p> : <>
      <div className="reminder-options"><button className="secondary-button" disabled={!connected} onClick={reminders.toggleBrowser}>{reminders.browserEnabled ? 'Desactivar notificaciones de esta sesión' : 'Activar notificaciones del navegador'}</button><label><input type="checkbox" checked={showRead} onChange={event => setShowRead(event.target.checked)} />Mostrar leídos</label></div>
      <p className="calendar-subtitle">Las notificaciones externas se activan por sesión y requieren permiso del navegador. Los avisos leídos se conservan.</p>
      {reminders.browserError && <p className="storage-warning" role="alert">{reminders.browserError}</p>}
      {!connected && <p className="storage-warning" role="status">Sin conexión: los avisos visibles son la última consulta y pueden estar desactualizados.</p>}
      {reminders.error && <p className="storage-warning" role="alert">No se pudieron actualizar los avisos: {reminders.error}</p>}
      {reminders.loading && <p className="loading-message" role="status">Cargando avisos…</p>}
      <ul className="reminder-events">{displayed.map(event => <li key={event.id}><div><button className="reminder-open" onClick={() => onOpen(event.taskId)}>{event.titulo}</button><p>Vence el {formatDate(event.fechaLimite)} · {event.daysBefore === 0 ? 'El mismo día' : event.daysBefore + ' días antes'}{event.readAt && ' · Leído'}</p></div>{!event.readAt && <button className="secondary-button" disabled={!connected} onClick={() => reminders.markRead(event.id)} aria-label={'Marcar leído: ' + event.titulo}>Marcar leído</button>}</li>)}</ul>
      {!reminders.loading && !reminders.error && !displayed.length && <p className="calendar-empty">No hay avisos pendientes.</p>}
    </>}
  </section>
}
