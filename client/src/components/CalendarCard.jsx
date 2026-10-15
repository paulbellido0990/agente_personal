import { CalendarDays } from 'lucide-react'
import { formatDate } from '../services/tasks'
export default function CalendarCard({ today }) {
  const date = new Date(today + 'T12:00:00Z')
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const first = new Date(Date.UTC(year, month, 1, 12))
  const offset = (first.getUTCDay() + 6) % 7
  const count = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate()
  const title = new Intl.DateTimeFormat('es-PE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
  return <section className="panel calendar-card">
    <div className="panel-heading"><h2>{title}</h2><CalendarDays size={18} className="muted" /></div>
    <p className="eyebrow-note">Referencia del mes · America/Lima</p>
    <div className="calendar-grid" role="img" aria-label={'Referencia del mes. Fecha de referencia: ' + formatDate(today) + '. No muestra tareas.'}>
      {['L','M','M','J','V','S','D'].map((day, i) => <span className="weekday" key={'weekday' + i}>{day}</span>)}
      {Array.from({ length: offset }, (_, i) => <span key={'blank' + i} />)}
      {Array.from({ length: count }, (_, i) => <span key={i} className={'calendar-day ' + (i + 1 === date.getUTCDate() ? 'selected-day' : '')}>{i + 1}</span>)}
    </div>
    <p className="calendar-preview">Vista de tareas en calendario: próximamente. Consulta las entregas en Mis tareas.</p>
  </section>
}
