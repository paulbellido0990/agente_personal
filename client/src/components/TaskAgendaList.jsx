import { CalendarDays } from 'lucide-react'
import { formatDate, priorityLabels, statusLabels } from '../services/tasks'
export default function TaskAgendaList({ tasks, today, onOpen, empty = 'No hay actividades en esta vista.' }) {
  return tasks.length ? <ul className="agenda-list">{tasks.map(task => <li key={task.id}>
    <button className="agenda-task" onClick={() => onOpen(task.id)}>
      <span className={'agenda-stripe priority-' + task.prioridad} />
      <span className="agenda-copy"><strong>{task.titulo}</strong><small><CalendarDays size={13} />{task.fechaLimite ? formatDate(task.fechaLimite) + ' · Día completo' : 'Sin fecha límite'} · {task.categoria}</small></span>
      <span className="agenda-tags"><span className={'badge priority-' + task.prioridad}>{priorityLabels[task.prioridad]}</span><span className={'badge state-' + task.estado}>{statusLabels[task.estado]}</span>{task.fechaLimite && task.fechaLimite < today && task.estado !== 'completada' && <span className="overdue">Vencida</span>}</span>
    </button>
  </li>)}</ul> : <p className="calendar-empty" role="status">{empty}</p>
}
