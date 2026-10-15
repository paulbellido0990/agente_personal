import { Search, Bell, Menu, ChevronDown } from 'lucide-react'
export default function Header({ query, setQuery, onMenu, demo, unread, onReminders, analytics, account }) {
  return <header className="topbar">
    <button className="icon-button menu-toggle" onClick={onMenu} aria-label="Abrir menú" aria-controls="navigation"><Menu size={22} /></button>
    <label className="search"><Search size={19} /><span className="sr-only">Buscar tareas por título o descripción</span><input value={query} onChange={e => setQuery(e.target.value)} disabled={analytics} placeholder={analytics ? 'Usa los filtros de esta sección' : 'Buscar tus tareas...'} type="search" /></label>
    <div className="header-actions"><span className="demo-pill">{demo ? 'Modo demostración' : 'SQLite · local'}</span><button className="icon-button notification" onClick={onReminders} aria-label={'Abrir recordatorios: ' + unread + ' pendientes'} title="Abrir recordatorios"><Bell size={21} />{unread > 0 && <span className="notification-count">{unread}</span>}</button><span className="header-divider" /><div className="profile"><span className="avatar">A</span><span className="profile-text"><strong>{account?.username || 'Mi espacio'}</strong><small>Sesión privada</small></span><ChevronDown size={15} aria-hidden="true" /></div></div>
  </header>
}
