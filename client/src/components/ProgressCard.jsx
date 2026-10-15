import { TrendingUp } from 'lucide-react'
import { summary } from '../data/demo'
export default function ProgressCard() {
  const percent = Math.round(summary.completadas / summary.total * 100)
  return <section className="panel progress-card"><div className="panel-heading"><div><h2>Pequeños pasos, grandes logros</h2><p>Progreso del conjunto de demostración</p></div><TrendingUp size={20} className="purple-text" /></div><div className="progress-content"><div className="progress-ring" style={{ '--progress': percent + '%' }} role="progressbar" aria-label="Tareas de demostración completadas" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><div><strong>{percent}%</strong><small>completado</small></div></div><div className="progress-copy"><span className="eyebrow">CADA TAREA CUENTA</span><h3>¡Vas por buen camino!</h3><p>En este ejemplo, se completaron <strong>{summary.completadas} de {summary.total} tareas.</strong> Un espacio organizado deja lugar para lo que importa.</p><div className="progress-legend"><span><i className="legend-dot" />Completadas</span><span><i className="legend-dot pale" />Por completar</span></div></div></div></section>
}
