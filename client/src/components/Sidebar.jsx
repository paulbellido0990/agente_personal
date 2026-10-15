import { useEffect, useRef } from 'react'
import { House, ListTodo, CalendarDays, ChartNoAxesCombined, Layers, Sparkles, Settings, ArrowUpRight, X } from 'lucide-react'
const items = [
  { label: 'Inicio', icon: House, key: 'inicio' },
  { label: 'Mis tareas', icon: ListTodo, key: 'tareas' },
  { label: 'Calendario', icon: CalendarDays, key: 'calendario' },
  { label: 'Planificación', icon: ListTodo, key: 'planificacion' },
  { label: 'Estadísticas', icon: ChartNoAxesCombined },
  { label: 'Categorías', icon: Layers },
  { label: 'Asistente IA', icon: Sparkles },
]
export default function Sidebar({ view, onNavigate, open, onClose }) {
  const closeRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    closeRef.current?.focus()
    return () => { if (previous?.isConnected) previous.focus() }
  }, [open])
  return <>
    {open && <button className="sidebar-backdrop" onClick={onClose} aria-label="Cerrar menú" />}
    <aside className={'sidebar ' + (open ? 'is-open' : '')} id="navigation" onKeyDown={event => { if (event.key === 'Escape') onClose() }}>
      <a className="brand" href="#contenido" onClick={() => onNavigate('inicio')}><img src="/alira.svg" alt="" /><span>ALIRA<small>Organiza. Avanza. Logra.</small></span></a>
      <button ref={closeRef} className="icon-button mobile-close" onClick={onClose} aria-label="Cerrar menú"><X size={20} /></button>
      <p className="nav-label">MI ESPACIO</p>
      <nav aria-label="Navegación principal">{items.map(({ label, icon: Icon, key }) =>
        <button key={label} className={'nav-item ' + (key === view ? 'active' : '')} onClick={key ? () => onNavigate(key) : undefined} disabled={!key} aria-current={key === view ? 'page' : undefined}>
          <Icon size={20} /><span>{label}</span>{!key && <small>Pronto</small>}
        </button>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-note"><span className="little-spark"><Sparkles size={19} /></span><h3>Un paso a la vez.</h3><p>Los grandes logros empiezan con pequeñas tareas.</p><span>Tu espacio para avanzar <ArrowUpRight size={14} /></span></div>
      <button className="nav-item" disabled><Settings size={20} /><span>Configuración</span><small>Pronto</small></button>
      <div className="sidebar-footer"><span className="status-dot" /> React + SQLite · v0.4</div></div>
    </aside>
  </>
}
