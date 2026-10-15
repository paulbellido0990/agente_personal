import { selectTasks } from '../services/tasks'
import TaskAgendaList from './TaskAgendaList'
export default function UpcomingCard({ tasks, today, onOpen }) {
  const upcoming = selectTasks(tasks.filter(t => t.estado !== 'completada' && t.fechaLimite)).slice(0,5)
  return <section className="panel upcoming-card"><div className="panel-heading"><h2>Próximos vencimientos</h2></div><p className="calendar-subtitle">Primero las entregas más cercanas, incluidas las vencidas.</p><TaskAgendaList tasks={upcoming} today={today} onOpen={onOpen} empty="Sin entregas pendientes con fecha." /></section>
}
