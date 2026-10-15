import { useState } from 'react'
import { planTasks } from '../../../shared/calendar'
import TaskAgendaList from './TaskAgendaList'
const periods = [['hoy','Hoy'],['manana','Mañana'],['semana','Próximos siete días'],['vencidas','Vencidas'],['sin_fecha','Sin fecha'],['completadas','Completadas']]
export default function PlanningPage({ tasks, today, onOpen }) {
  const [period, setPeriod] = useState('hoy')
  const [sort, setSort] = useState('fechaLimite')
  const selected = planTasks(tasks, period, today, sort)
  return <section className="panel planning-page"><div className="panel-heading"><div><h2>Planificación</h2><p>Organiza tus entregas sin asignar horarios ficticios.</p></div><label className="planning-sort">Ordenar por<select value={sort} onChange={event => setSort(event.target.value)}><option value="fechaLimite">Fecha límite</option><option value="prioridad">Prioridad</option></select></label></div>
    <div className="planning-periods" aria-label="Periodo de planificación">{periods.map(([value,label]) => <button key={value} className={value === period ? 'selected' : ''} aria-pressed={value === period} onClick={() => setPeriod(value)}>{label} <span>{planTasks(tasks,value,today).length}</span></button>)}</div>
    <p className="calendar-subtitle">{period === 'semana' ? 'Desde hoy hasta el sexto día siguiente, inclusive.' : 'Actividades de día completo cuando tienen fecha límite.'}</p>
    <TaskAgendaList tasks={selected} today={today} onOpen={onOpen} />
  </section>
}
