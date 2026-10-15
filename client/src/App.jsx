import { useState } from 'react'
import { ArrowRight, CalendarDays, Info, Plus, X } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import SummaryCards from './components/SummaryCards'
import TaskTable from './components/TaskTable'
import CalendarCard from './components/CalendarCard'
import ProgressCard from './components/ProgressCard'
import AssistantCard from './components/AssistantCard'
import TaskForm from './components/TaskForm'
import DeleteTaskDialog from './components/DeleteTaskDialog'
import ImportTasksDialog from './components/ImportTasksDialog'
import useTasks from './hooks/useTasks'
import useToday from './hooks/useToday'
import { summarize, formatDate } from './services/tasks'
import { DEMO_DATE } from './data/demo'

export default function App() {
  const manager = useTasks()
  const realToday = useToday()
  const today = manager.demo ? DEMO_DATE : realToday
  const summary = summarize(manager.tasks, today)
  const [editor, setEditor] = useState(null)
  const [importing, setImporting] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [view, setView] = useState('inicio')
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const create = () => setEditor({ task: null })
  const navigate = value => { setView(value); setMenuOpen(false) }

  return <>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <div className="app-shell">
      <Sidebar view={view} onNavigate={navigate} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="workspace">
        <Header query={query} setQuery={setQuery} onMenu={() => setMenuOpen(!menuOpen)} demo={manager.demo} />
        <main id="contenido" tabIndex="-1">
          <div className="page-heading">
            <div>
              <span className="eyebrow">TU ESPACIO PARA AVANZAR</span>
              <h1>{view === 'inicio' ? 'Un día más cerca de tus metas' : 'Todo empieza con un pequeño paso'}<span className="heading-dot">.</span></h1>
              <p>Organiza tus ideas, enfócate en lo importante y celebra cada avance.</p>
            </div>
            <span className="date-chip"><CalendarDays size={16} />{formatDate(today)} {manager.demo && <small>Demo</small>}</span>
          </div>

          <div className="demo-notice">
            <Info size={18} />
            <p>{manager.demo
              ? <><strong>Modo demostración.</strong> Tareas y fecha ficticias. Los cambios se conservan solo durante la sesión y están separados de tus tareas.</>
              : <><strong>Tu espacio personal.</strong> Tus tareas se guardan en la base SQLite del backend local. La demo permanece separada.</>}
            </p>
            <button className="secondary-button demo-switch" disabled={manager.busy || manager.loading} onClick={() => { manager.toggleDemo(); setQuery('') }}>
              {manager.demo ? 'Volver a mis tareas' : 'Explorar demo'}
            </button>
          </div>
          {!manager.demo && manager.warning && <p className="storage-warning" role="alert">{manager.warning}</p>}
          {manager.notice && <div className={'notice ' + manager.notice.type} role={manager.notice.type === 'error' ? 'alert' : 'status'}>
            <span>{manager.notice.text}</span>
            <button className="icon-button" onClick={manager.dismissNotice} aria-label="Cerrar mensaje"><X size={18} /></button>
          </div>}

          {!manager.demo && <>
            <div className="connection-bar" role="status">
              <span>{manager.loading ? 'Conectando con ALIRA…' : manager.connected ? 'Conectado al backend local' : 'No se pudo conectar con el backend'}</span>
              <button className="secondary-button" disabled={manager.loading || manager.busy} onClick={manager.reload}>Actualizar listado</button>
            </div>
            {!!manager.localTasks.length && <section className="migration-panel" aria-label="Importar tareas locales">
              <p>Encontramos {manager.localTasks.length} tareas de la fase anterior. Puedes importarlas sin borrar la copia local ni sobrescribir las del servidor.</p>
              <button className="primary-button" disabled={!manager.connected || manager.loading || manager.busy} onClick={() => setImporting(true)}>Importar tareas locales</button>
            </section>}
            {!!manager.excludedDemo && <p className="storage-warning">Se excluyeron {manager.excludedDemo} registros identificados como demo de la importación.</p>}
          </>}
          {manager.demo || manager.connected || manager.tasks.length > 0
            ? <div aria-busy={!manager.demo && manager.loading}><SummaryCards summary={summary} /></div>
            : <p className="panel loading-message" role="status">{manager.loading ? 'Cargando resumen de tareas…' : 'Resumen no disponible hasta conectar con el servidor.'}</p>}
          <div className="dashboard-columns">
            <div className="main-column">
              <div className="section-toolbar">
                <div className="view-tabs" aria-label="Vista">
                  <button onClick={() => navigate('inicio')} className={view === 'inicio' ? 'selected' : ''} aria-pressed={view === 'inicio'}>Vista general</button>
                  <button onClick={() => navigate('tareas')} className={view === 'tareas' ? 'selected' : ''} aria-pressed={view === 'tareas'}>Mis tareas</button>
                </div>
                <button id="new-task" className="new-task" disabled={manager.busy || (!manager.demo && (manager.loading || !manager.connected))} onClick={create}><Plus size={17} />Nueva tarea</button>
              </div>
              <TaskTable
                key={manager.demo ? 'demo' : 'real'}
                query={query} expanded={view === 'tareas'} tasks={manager.tasks}
                demo={manager.demo} today={today}
                onEdit={task => setEditor({ task })} onDelete={setDeleting}
                onStatus={manager.changeStatus} onCreate={create}
                busy={manager.busy} loading={!manager.demo && manager.loading} connected={manager.connected}
              />
              {(manager.demo || manager.connected || manager.tasks.length > 0) && <ProgressCard summary={summary} />}
              <div className="closing-note">
                <span>Organiza. Avanza. Logra.</span>
                <p>Tu próxima gran idea merece su propio espacio.</p>
                <ArrowRight size={19} />
              </div>
            </div>
            <aside className="right-column" aria-label="Calendario y asistente">
              <CalendarCard today={today} />
              <AssistantCard />
            </aside>
          </div>
          <footer className="page-footer">
            <span>ALIRA <span className="muted">· Tu asistente inteligente de tareas</span></span>
            <span>Hecho para avanzar a tu ritmo.</span>
          </footer>
        </main>
      </div>
    </div>
    {importing && <ImportTasksDialog count={manager.localTasks.length} onConfirm={manager.importLocal} onClose={() => setImporting(false)} />}
    {editor && <TaskForm task={editor.task} categories={[...new Set(manager.tasks.map(t => t.categoria))]} onSave={manager.save} onClose={() => setEditor(null)} />}
    {deleting && <DeleteTaskDialog task={deleting} onConfirm={manager.remove} onClose={() => setDeleting(null)} />}
  </>
}
