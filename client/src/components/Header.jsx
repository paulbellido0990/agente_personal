import { Search, Bell, Menu, ChevronDown } from 'lucide-react'
export default function Header({ query, setQuery, onMenu, demo }) {
  return <header className="topbar">
    <button className="icon-button menu-toggle" onClick={onMenu} aria-label="Abrir menú" aria-controls="navigation"><Menu size={22} /></button>
    <label className="search"><Search size={19} /><span className="sr-only">Buscar tareas por título o descripción</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar tus tareas..." type="search" /></label>
    <div className="header-actions"><span className="demo-pill">{demo ? 'Modo demostración' : 'SQLite · local'}</span><button className="icon-button notification" disabled aria-label="Notificaciones: próximamente" title="Notificaciones: próximamente"><Bell size={21} /></button><span className="header-divider" /><div className="profile"><span className="avatar">A</span><span className="profile-text"><strong>Mi espacio</strong><small>Sin inicio de sesión</small></span><ChevronDown size={15} aria-hidden="true" /></div></div>
  </header>
}
