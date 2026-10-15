import { Layers, Clock3, CircleCheck, CalendarClock } from 'lucide-react'
export default function SummaryCards({ summary }) {
const cards = [
  { title: 'Tareas totales', value: summary.total, icon: Layers, tone: 'purple', note: 'Todo en un solo lugar' },
  { title: 'Pendientes', value: summary.pendientes, icon: Clock3, tone: 'amber', note: 'Incluye tareas en progreso' },
  { title: 'Completadas', value: summary.completadas, icon: CircleCheck, tone: 'green', note: 'Cada avance cuenta' },
  { title: 'Próximas a vencer', value: summary.proximas, icon: CalendarClock, tone: 'rose', note: 'Hoy y los próximos 3 días' },
]
  return <section className="summary-grid" aria-label="Resumen de tareas">{cards.map(({ title, value, icon: Icon, tone, note }) => <article className="summary-card" key={title}><div className="summary-top"><span className={'stat-icon ' + tone}><Icon size={21} /></span></div><p>{title}</p><strong className="stat-number">{String(value).padStart(2, '0')}</strong><small>{note}</small></article>)}</section>
}
