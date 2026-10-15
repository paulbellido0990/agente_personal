import { CalendarDays } from 'lucide-react'
import { calendarDays, monthLabel } from '../../../shared/calendar'
import { formatDate } from '../services/tasks'
export default function CalendarCard({ today, tasks, onSelect }) {
  return <section className="panel calendar-card"><div className="panel-heading"><h2>{monthLabel(today)}</h2><CalendarDays size={18} className="muted" /></div><p className="eyebrow-note">Tus fechas límite · America/Lima</p><div className="calendar-grid" aria-label="Calendario compacto">
    {['L','M','M','J','V','S','D'].map((day,index) => <span className="weekday" key={'weekday' + index}>{day}</span>)}
    {calendarDays(today).map((day,index) => {
      if (!day) return <span key={'outside' + index} />
      const count = tasks.filter(t => t.fechaLimite === day).length
      return <button key={day} className={'calendar-day compact-day ' + (day === today ? 'selected-day ' : '') + (count ? 'has-task' : '')} onClick={() => onSelect(day)} aria-label={formatDate(day) + ', ' + count + ' tareas'} aria-current={day === today ? 'date' : undefined} title={count + ' tareas'}>{Number(day.slice(-2))}</button>
    })}
  </div><p className="calendar-preview">Selecciona una fecha para ver sus tareas.</p></section>
}
