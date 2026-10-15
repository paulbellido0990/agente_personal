import { useState, lazy, Suspense } from 'react'
import { ArrowRight, CalendarDays, Info, Plus, X } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import SummaryCards from './components/SummaryCards'
import TaskTable from './components/TaskTable'
import CalendarCard from './components/CalendarCard'
import ProgressCard from './components/ProgressCard'
import PwaPanel from './components/PwaPanel'
import SecuritySettings from './components/SecuritySettings'
import TaskForm from './components/TaskForm'
import DeleteTaskDialog from './components/DeleteTaskDialog'
import ImportTasksDialog from './components/ImportTasksDialog'
import useRemote from './hooks/useRemote'
import AnnouncementCards from './components/AnnouncementCards'
import CommunicationsPage from './components/CommunicationsPage'
import SharesPage from './components/SharesPage'
import ControlPage from './components/ControlPage'
import {taskApi} from './services/taskApi'
import useAcademic from './hooks/useAcademic'
import AcademicPage from './components/AcademicPage'
import AcademicSchedule from './components/AcademicSchedule'
import useTasks from './hooks/useTasks'
import useToday from './hooks/useToday'
import useReminders from './hooks/useReminders'
import CalendarPage from './components/CalendarPage'
import PlanningPage from './components/PlanningPage'
import TaskDetails from './components/TaskDetails'
import UpcomingCard from './components/UpcomingCard'
import ReminderPanel from './components/ReminderPanel'
import { summarize, formatDate, selectTasks } from './services/tasks'
import { DEMO_DATE } from './data/demo'

const StatisticsPage = lazy(() => import('./components/StatisticsPage'))
const GoalsPage = lazy(() => import('./components/GoalsPage'))
export default function App({account,onLogout}) {
  const manager = useTasks(account.id)
  const communications = useRemote('/communications',!manager.demo)
  const academic = useAcademic(manager.demo)
  const [scope, setScope] = useState('')
  const [academicLanding,setAcademicLanding] = useState('terms')
  const realToday = useToday()
  const today = manager.demo ? DEMO_DATE : realToday
  const reminders = useReminders({ demo: manager.demo, tasks: manager.tasks, connected: manager.connected })
  const summary = summarize(manager.tasks, today)
  const [editor, setEditor] = useState(null)
  const [importing, setImporting] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [detailsId, setDetailsId] = useState(null)
  const [calendarDate, setCalendarDate] = useState(today)
  const [view, setView] = useState('inicio')
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const analytical = view === 'estadisticas' || view === 'objetivos' || view === 'recordatorios' || view === 'configuracion' || view === 'academico' || view === 'comunicaciones' || view === 'compartir' || view === 'control'
  const create = initialDate => setEditor({ task: null, initialDate: typeof initialDate === 'string' ? initialDate : null })
  const disabled = manager.busy || (!manager.demo && (manager.loading || !manager.connected))
  const detailedTask = manager.tasks.find(task => task.id === detailsId)
  const openTask = id => setDetailsId(id)
  const saveTask = async (...args) => { const ok=await manager.save(...args);if(ok&&!manager.demo)academic.refresh();return ok }
  const changeStatus = async (...args) => { const ok=await manager.changeStatus(...args);if(ok&&!manager.demo)academic.refresh();return ok }
  const scopedTasks = manager.tasks.filter(t => !scope || (scope === 'academic' ? !!t.academic : !t.academic))
  const visibleTasks = selectTasks(manager.tasks, { query })
  const selectCalendarDate = day => { setCalendarDate(day); setView('calendario'); setMenuOpen(false) }

  const createAcademic = initialAcademic => setEditor({task:null,initialAcademic})
  const showSchedule = () => { setAcademicLanding('sessions'); setView('academico'); setMenuOpen(false) }
  const openReminder = event => { if(event.type && event.type!=='recordatorio'){navigate('comunicaciones');return} if(event.sessionId) showSchedule(); else openTask(event.taskId) }
  const navigate = value => { if(value==='academico')setAcademicLanding('terms');setView(value); setMenuOpen(false) }

  return <>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <div className="app-shell">
      <Sidebar account={account} view={view} onNavigate={navigate} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="workspace">
        <Header query={query} setQuery={setQuery} onMenu={() => setMenuOpen(!menuOpen)} demo={manager.demo} unread={reminders.events.filter(e => !e.readAt).length} reminders={reminders} connected={manager.connected} onOpen={id => openTask(id)} onOpenReminder={openReminder} onNavigate={navigate} analytics={analytical && view !== 'academico'} account={account} />
        <main id="contenido" tabIndex="-1">
          <div className="page-heading">
            <div>
              <span className="eyebrow">TU ESPACIO PARA AVANZAR</span>
              <h1>{view === 'inicio' ? 'Un día más cerca de tus metas' : view === 'calendario' ? 'Un lugar para cada entrega' : view === 'planificacion' ? 'Tu siguiente paso, con claridad' : view === 'estadisticas' ? 'Tus avances, con contexto' : view === 'objetivos' ? 'Metas que avanzan contigo' : view === 'recordatorios' ? 'Tus entregas, a tiempo' : view === 'academico' ? 'Tu semestre, organizado' : view === 'control' ? 'ALIRA Control' : view === 'comunicaciones' ? 'Un espacio para comunicarte' : view === 'compartir' ? 'Comparte con tu autorización' : view === 'configuracion' ? 'ALIRA a tu manera' : 'Todo empieza con un pequeño paso'}<span className="heading-dot">.</span></h1>
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
            <button className="secondary-button demo-switch" disabled={manager.busy || manager.loading} onClick={() => { manager.toggleDemo(); setQuery(''); setCalendarDate(manager.demo ? realToday : DEMO_DATE) }}>
              {manager.demo ? 'Volver a mis tareas' : 'Explorar demo'}
            </button>
          </div>
          <PwaPanel settings={view === 'configuracion'} busy={manager.busy || !!editor || !!deleting || importing || ['academico','control','comunicaciones','compartir'].includes(view)} />
          {!manager.demo && !manager.connected && !manager.loading && <p className="storage-warning" role="status">Sin conexión con el backend. La información visible puede estar desactualizada. Crear o modificar tareas requiere conexión; no hay guardado offline. Se reintentará automáticamente.</p>}
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
          <Suspense fallback={<p className="panel loading-message" role="status">Cargando sección…</p>}>
            {view === 'estadisticas' && <StatisticsPage academic={academic.data} onAcademic={() => navigate('academico')} today={realToday} tasks={manager.tasks} demo={manager.demo} connected={manager.connected} onGoals={() => navigate('objetivos')}/>}
            {view === 'objetivos' && <GoalsPage today={realToday} tasks={manager.tasks} demo={manager.demo} connected={manager.connected}/>}
          </Suspense>
          {view === 'inicio' && !manager.demo && <AnnouncementCards compact announcements={communications.data?.announcements} onOpen={()=>navigate('comunicaciones')} onRead={async id=>{try{await taskApi.platform('/notifications/anuncio/'+id+'/read',{method:'PATCH',body:{}});communications.refresh();reminders.refresh()}catch{communications.refresh()}}}/>}
          {!analytical && <>
          {manager.demo || manager.connected || manager.tasks.length > 0
            ? <div aria-busy={!manager.demo && manager.loading}><SummaryCards summary={summary} /></div>
            : <p className="panel loading-message" role="status">{manager.loading ? 'Cargando resumen de tareas…' : 'Resumen no disponible hasta conectar con el servidor.'}</p>}
          <div className="dashboard-columns">
            <div className="main-column">
              {(view === 'inicio' || view === 'tareas') && <><div className="section-toolbar">
                <div className="view-tabs" aria-label="Vista">
                  <button onClick={() => navigate('inicio')} className={view === 'inicio' ? 'selected' : ''} aria-pressed={view === 'inicio'}>Vista general</button>
                  <button onClick={() => navigate('tareas')} className={view === 'tareas' ? 'selected' : ''} aria-pressed={view === 'tareas'}>Mis tareas</button>
                </div>
                <button id="new-task" className="new-task" disabled={manager.busy || (!manager.demo && (manager.loading || !manager.connected))} onClick={create}><Plus size={17} />Nueva tarea</button>
              </div>
              <label className="scope-filter">Ámbito de las tareas<select value={scope} onChange={e=>setScope(e.target.value)}><option value="">Personales y académicas</option><option value="personal">Solo personales</option><option value="academic">Solo académicas</option></select></label>
              <TaskTable
                key={manager.demo ? 'demo' : 'real'}
                query={query} expanded={view === 'tareas'} tasks={scopedTasks}
                demo={manager.demo} today={today}
                onEdit={task => setEditor({ task })} onDelete={setDeleting}
                onStatus={changeStatus} onCreate={create}
                busy={manager.busy} loading={!manager.demo && manager.loading} connected={manager.connected}
              />
              </>}
              {(view === 'calendario' || view === 'planificacion') && !manager.demo && !manager.connected && <p className="storage-warning">{manager.loading ? 'Cargando tareas…' : 'Sin conexión. Los datos visibles pueden estar desactualizados.'}</p>}
              {view === 'calendario' && <CalendarPage academic={academic.data} onClass={showSchedule} tasks={visibleTasks} today={today} selected={calendarDate} onSelect={setCalendarDate} onOpen={openTask} onCreate={create} disabled={disabled} />}
              {view === 'planificacion' && <PlanningPage tasks={visibleTasks} today={today} onOpen={openTask} />}
              {(manager.demo || manager.connected || manager.tasks.length > 0) && <ProgressCard summary={summary} />}
              <div className="closing-note">
                <span>Organiza. Avanza. Logra.</span>
                <p>Tu próxima gran idea merece su propio espacio.</p>
                <ArrowRight size={19} />
              </div>
            </div>
            <aside className="right-column" aria-label="Calendario y próximos vencimientos">
              {!manager.demo && academic.data.courses.length > 0 && <AcademicSchedule compact today={today} sessions={academic.data.sessions} courses={academic.data.courses} onNavigate={showSchedule} />}
              <CalendarCard today={today} tasks={manager.tasks} onSelect={selectCalendarDate} />
              <UpcomingCard tasks={manager.tasks} today={today} onOpen={openTask} />
              <section className="panel productivity-note"><h2>Organiza. Avanza. Logra.</h2><p>Planifica tus próximas entregas y revisa el avance de tus objetivos.</p><button className="secondary-button" onClick={() => navigate('objetivos')}>Ver mis objetivos</button></section>
            </aside>
          </div>
          </>}
          {view === 'academico' && <AcademicPage key={academicLanding} initialSection={academicLanding} academic={academic} tasks={manager.tasks} today={today} disabled={disabled} demo={manager.demo} query={query} onCreate={createAcademic} onEdit={task=>setEditor({task})} onDelete={setDeleting} onStatus={changeStatus} />}
          {view === 'comunicaciones' && <CommunicationsPage resource={communications} account={account} connected={manager.connected} onChanged={reminders.refresh}/>}
          {view === 'compartir' && <SharesPage account={account} connected={manager.connected}/>}
          {view === 'control' && account.id==='1' && account.role==='administrador' && <ControlPage account={account} connected={manager.connected} onLogout={onLogout} communications={communications} onChanged={()=>{communications.refresh();reminders.refresh()}}/>}
          {view === 'configuracion' && <SecuritySettings account={account} onLogout={onLogout} connected={manager.connected}/>}
          {view !== 'configuracion' && <ReminderPanel reminders={reminders} demo={manager.demo} connected={manager.connected} onOpen={openTask} onOpenReminder={openReminder} />}
          <footer className="page-footer">
            <span>ALIRA <span className="muted">· Gestor personal de tareas</span></span>
            <span>Hecho para avanzar a tu ritmo.</span>
          </footer>
        </main>
      </div>
    </div>
    {detailedTask && <TaskDetails courses={academic.data.courses} task={detailedTask} onClose={() => setDetailsId(null)} disabled={disabled} onEdit={task => { setDetailsId(null); setEditor({ task }) }} onDelete={task => { setDetailsId(null); setDeleting(task) }} />}
    {importing && <ImportTasksDialog count={manager.localTasks.length} onConfirm={manager.importLocal} onClose={() => setImporting(false)} />}
    {editor && <TaskForm courses={manager.demo ? [] : academic.data.courses} tasks={manager.tasks} initialAcademic={editor.initialAcademic} task={editor.task} initialDate={editor.initialDate} categories={[...new Set(manager.tasks.map(t => t.categoria))]} onSave={saveTask} onClose={() => setEditor(null)} />}
    {deleting && <DeleteTaskDialog task={deleting} onConfirm={manager.remove} onClose={() => setDeleting(null)} />}
  </>
}
