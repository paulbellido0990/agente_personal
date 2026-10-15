import { useEffect, useRef, useState } from 'react'
import { Search, Bell, Menu, ChevronDown } from 'lucide-react'
export default function Header({ query, setQuery, onMenu, demo, unread, reminders, connected, onOpen, onOpenReminder, onNavigate, analytics, account }) {
  const [panel, setPanel] = useState(null)
  const root = useRef(null)
  const bell = useRef(null)
  const profile = useRef(null)
  useEffect(() => {
    if (!panel) return
    const previous = panel === 'notifications' ? bell.current : profile.current
    root.current.querySelector('.header-popover button')?.focus()
    const outside = event => { if (!root.current?.contains(event.target)) setPanel(null) }
    const escape = event => { if (event.key === 'Escape') { setPanel(null); previous?.focus() } }
    const focus = event => { if (!root.current?.contains(event.target)) setPanel(null) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    document.addEventListener('focusin', focus)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); document.removeEventListener('focusin', focus) }
  }, [panel])
  const toggle = value => setPanel(current => current === value ? null : value)
  return <header className="topbar">
    <button className="icon-button menu-toggle" onClick={onMenu} aria-label="Abrir menú" aria-controls="navigation"><Menu size={22} /></button>
    <label className="search"><Search size={19} /><span className="sr-only">Buscar tareas por título o descripción</span><input value={query} onChange={e => setQuery(e.target.value)} disabled={analytics} placeholder={analytics ? 'Usa los filtros de esta sección' : 'Buscar tus tareas...'} type="search" /></label>
    <div className="header-actions" ref={root}>
      <span className="demo-pill">{demo ? 'Modo demostración' : 'SQLite · local'}</span>
      <button ref={bell} className="icon-button notification" onClick={() => toggle('notifications')} aria-expanded={panel === 'notifications'} aria-controls="notification-popover" aria-label={'Abrir recordatorios: ' + unread + ' pendientes'}><Bell size={21} />{unread > 0 && <span className="notification-count">{unread}</span>}</button>
      <span className="header-divider" />
      <button ref={profile} className="profile profile-button" aria-label="Menú de cuenta" aria-expanded={panel === 'profile'} onClick={() => toggle('profile')}><span className="avatar">{account?.username?.[0]?.toUpperCase() || 'A'}</span><span className="profile-text"><strong>{account?.username || 'Mi espacio'}</strong><small>Sesión privada</small></span><ChevronDown size={15} aria-hidden="true" /></button>
      {panel === 'profile' && <section className="header-popover profile-popover" aria-label="Cuenta"><h2>Mi cuenta</h2><button className="secondary-button" onClick={() => { setPanel(null); onNavigate('configuracion') }}>Cuenta y seguridad</button></section>}
      {panel === 'notifications' && <section className="header-popover" id="notification-popover" aria-labelledby="notification-heading">
        <div className="panel-heading"><h2 id="notification-heading">Notificaciones</h2><button className="secondary-button" onClick={() => { setPanel(null); bell.current?.focus() }}>Cerrar</button></div>
        <p className="muted">{unread} sin leer · avisos del sistema de recordatorios</p>
        {demo && <p>Los avisos están desactivados en la demo.</p>}
        {!connected && !demo && <p role="status">Sin conexión. Los avisos pueden estar desactualizados.</p>}
        {reminders.error && <p role="alert">{reminders.error}</p>}
        <ul className="notification-list">{reminders.events.slice(0, 20).map(event => <li key={event.id} className={event.readAt ? 'is-read' : 'is-unread'}>
          <button className="reminder-open" onClick={() => { (onOpenReminder ? onOpenReminder(event) : onOpen(event.taskId)); setPanel(null) }}>{event.titulo}</button>
          <span>{event.readAt ? 'Leído' : 'Sin leer'}</span>
          {event.createdAt && <time dateTime={event.createdAt}>{new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.createdAt))}</time>}
          {!event.readAt && <button disabled={!connected} className="secondary-button" onClick={() => reminders.markRead(event.id)}>Marcar leído</button>}
        </li>)}</ul>
        {!demo && !reminders.events.length && <p>{reminders.loading ? 'Cargando avisos…' : 'No hay notificaciones recientes.'}</p>}
        <button className="secondary-button" onClick={() => { setPanel(null); onNavigate('recordatorios') }}>Ver todos los recordatorios</button>
      </section>}
    </div>
  </header>
}
