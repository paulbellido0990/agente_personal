import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { calendarDays, shiftDate, monthLabel } from '../../../shared/calendar'
import { formatDate, priorityLabels } from '../services/tasks'
import TaskAgendaList from './TaskAgendaList'
export default function CalendarPage({ tasks, today, selected, onSelect, onOpen, onCreate, disabled }) {
  const [view, setView] = useState('month')
  const days = calendarDays(selected, view)
  const selectedTasks = tasks.filter(task => task.fechaLimite === selected)
  const label = view === 'month' ? monthLabel(selected) : view === 'day' ? formatDate(selected) : formatDate(days.find(Boolean)) + ' – ' + formatDate(days.filter(Boolean).at(-1))
  return <section className="calendar-page panel" aria-labelledby="calendar-title">
    <div className="calendar-toolbar"><div><h2 id="calendar-title">Calendario</h2><p className="calendar-subtitle">Fechas límite · actividades de día completo · America/Lima</p></div><div className="calendar-view-switch" aria-label="Vista del calendario">{[['month','Mes'],['week','Semana'],['day','Día']].map(([value,label]) => <button key={value} aria-pressed={view === value} className={view === value ? 'selected' : ''} onClick={() => setView(value)}>{label}</button>)}</div></div>
    <div className="calendar-navigation"><button className="icon-button" aria-label="Periodo anterior" title="Periodo anterior" onClick={() => onSelect(shiftDate(selected,view,-1))}><ChevronLeft size={20} /></button><h3 aria-live="polite">{label}</h3><button className="icon-button" aria-label="Periodo siguiente" title="Periodo siguiente" onClick={() => onSelect(shiftDate(selected,view,1))}><ChevronRight size={20} /></button><button className="secondary-button" onClick={() => onSelect(today)}>Hoy</button></div>
    {view !== 'day' && <div className={'full-calendar-grid view-' + view}>
      {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(day => <span className="calendar-weekday" key={day}>{day}</span>)}
      {days.map((day,index) => {
        if (!day) return <span key={'outside' + index} />
        const dayTasks = tasks.filter(task => task.fechaLimite === day)
        return <button key={day} className={'calendar-cell ' + (day === selected ? 'is-selected ' : '') + (day === today ? 'is-today ' : '') + (day.slice(0,7) !== selected.slice(0,7) ? 'other-month' : '')} onClick={() => onSelect(day)} aria-pressed={day === selected} aria-current={day === today ? 'date' : undefined} aria-label={formatDate(day) + ', ' + dayTasks.length + ' tareas'}>
          <span className="cell-day">{Number(day.slice(-2))}{day === today && <span className="today-label">Hoy</span>}</span>
          <span className="cell-count">{dayTasks.length ? dayTasks.length + ' tareas' : ''}</span>
          <span className="cell-priority-summary">{Object.entries(priorityLabels).map(([priority,label]) => {
            const count = dayTasks.filter(t => t.prioridad === priority).length
            return count ? <span key={priority} className={'priority-' + priority} title={label + ': ' + count} aria-label={'Prioridad ' + label + ': ' + count}>{label[0]} {count}</span> : null
          })}</span>
          <span className="cell-tasks">{dayTasks.slice(0,3).map(task => <span key={task.id} className={'cell-task priority-' + task.prioridad} title={task.titulo + ' · Prioridad ' + priorityLabels[task.prioridad]}><span className="priority-dot" />{priorityLabels[task.prioridad]} · {task.titulo}</span>)}{dayTasks.length > 3 && <span className="more-tasks">+{dayTasks.length - 3} más</span>}</span>
        </button>
      })}
    </div>}
    <p className="calendar-subtitle">Prioridad: A = Alta · M = Media · B = Baja. Selecciona un día para ver sus detalles.</p>
    <div className="selected-agenda"><div className="panel-heading"><div><h3>Actividades del {formatDate(selected)}</h3><p>Día completo · sin horarios asignados</p></div><button className="primary-button" disabled={disabled} onClick={() => onCreate(selected)}><Plus size={16} />Crear para esta fecha</button></div><TaskAgendaList tasks={selectedTasks} today={today} onOpen={onOpen} empty="No hay tareas con fecha límite este día." /></div>
  </section>
}
