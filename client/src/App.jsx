import { useState } from 'react'
import { ArrowRight, CalendarDays, Info, Plus } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import SummaryCards from './components/SummaryCards'
import TaskTable from './components/TaskTable'
import CalendarCard from './components/CalendarCard'
import ProgressCard from './components/ProgressCard'
import AssistantCard from './components/AssistantCard'
export default function App() {
  const [view, setView] = useState('inicio')
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = value => { setView(value); setMenuOpen(false) }
  return <><a className="skip-link" href="#contenido">Saltar al contenido</a><div className="app-shell"><Sidebar view={view} onNavigate={navigate} open={menuOpen} onClose={() => setMenuOpen(false)} /><div className="workspace"><Header query={query} setQuery={setQuery} onMenu={() => setMenuOpen(!menuOpen)} /><main id="contenido" tabIndex="-1"><div className="page-heading"><div><span className="eyebrow">TU ESPACIO PARA AVANZAR</span><h1>{view === 'inicio' ? 'Un día más cerca de tus metas' : 'Todo empieza con un pequeño paso'}<span className="heading-dot">.</span></h1><p>Organiza tus ideas, enfócate en lo importante y celebra cada avance.</p></div><span className="date-chip"><CalendarDays size={16} />14 de octubre, 2026 <small>Demo</small></span></div>
    <div className="demo-notice"><Info size={18} /><p><strong>Estás explorando ALIRA.</strong> Los datos y la fecha son ficticios. Esta versión presenta la interfaz visual.</p></div>
    <SummaryCards />
    <div className="dashboard-columns"><div className="main-column"><div className="section-toolbar"><div className="view-tabs" aria-label="Vista"><button onClick={() => navigate('inicio')} className={view === 'inicio' ? 'selected' : ''} aria-pressed={view === 'inicio'}>Vista general</button><button onClick={() => navigate('tareas')} className={view === 'tareas' ? 'selected' : ''} aria-pressed={view === 'tareas'}>Mis tareas</button></div><button className="new-task" disabled title="Crear tareas estará disponible en una próxima entrega"><Plus size={17} />Nueva tarea <small>Pronto</small></button></div><TaskTable query={query} expanded={view === 'tareas'} /><ProgressCard /><div className="closing-note"><span>Organiza. Avanza. Logra.</span><p>Tu próxima gran idea merece su propio espacio.</p><ArrowRight size={19} /></div></div><aside className="right-column" aria-label="Calendario y asistente"><CalendarCard /><AssistantCard /></aside></div>
    <footer className="page-footer"><span>ALIRA <span className="muted">· Tu asistente inteligente de tareas</span></span><span>Hecho para avanzar a tu ritmo.</span></footer></main></div></div></>
}
