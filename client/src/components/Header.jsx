import { Search, Bell, Menu, ChevronDown } from 'lucide-react'
export default function Header({ query, setQuery, onMenu }) {
  return <header className="topbar">
    <button className="icon-button menu-toggle" onClick={onMenu} aria-label="Abrir menú" aria-controls="navigation"><Menu size={22} /></button>
    <label className="search"><Search size={19} /><span className="sr-only">Buscar tareas de demostración</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar en las tareas de demo..." type="search" /></label>
    <div className="header-actions"><span className="demo-pill">Modo demostración</span><button className="icon-button notification" disabled aria-label="Notificaciones: próximamente" title="Notificaciones: próximamente"><Bell size={21} /></button><span className="header-divider" /><div className="profile"><span className="avatar">D</span><span className="profile-text"><strong>Cuenta de ejemplo</strong><small>Espacio personal · Demo</small></span><ChevronDown size={15} aria-hidden="true" /></div></div>
  </header>
}
