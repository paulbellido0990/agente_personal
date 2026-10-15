import { useEffect,useState } from 'react'
import { taskApi } from '../services/taskApi'
import GoalForm from './GoalForm'
export default function GoalsPage({today,tasks,demo,connected}) {
  const [goals,setGoals]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
  const [editor,setEditor]=useState(null),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0)
  useEffect(()=>{
    if(demo)return
    const controller=new AbortController()
    Promise.resolve().then(()=>{if(controller.signal.aborted)return;setLoading(true);setError('');return taskApi.goals(controller.signal)})
      .then(result=>{if(result&&!controller.signal.aborted){setGoals(result);setLoading(false)}})
      .catch(failure=>{if(!controller.signal.aborted){setError(failure.message);setLoading(false)}})
    return ()=>controller.abort()
  },[tasks,demo,revision,connected])
  useEffect(()=>{const refresh=()=>setRevision(n=>n+1);const timer=setInterval(refresh,10000);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh)}},[])
  async function save(values,id){
    if (!connected) throw new Error('Reconecta con el backend para guardar metas.')
    const result=id?await taskApi.updateGoal(id,values,editor?.goal?.version):await taskApi.createGoal(values)
    setGoals(current=>id?current.map(g=>g.id===id?result:g):[result,...current])
  }
  async function toggle(goal){
    setBusy(true);setError('')
    try{const result=await taskApi.toggleGoal(goal.id,!goal.activa,goal.version);setGoals(current=>current.map(g=>g.id===goal.id?result:g))}catch(failure){setError(failure.message)}finally{setBusy(false)}
  }
  if(demo)return <section className="panel statistics-page"><h2>Objetivos personales</h2><p className="calendar-empty">Las metas usan exclusivamente finalizaciones reales de SQLite. Sal del modo demo para configurarlas.</p></section>
  return <section className="goals-page"><div className="statistics-heading"><div><span className="eyebrow">AVANZA A TU RITMO</span><h2>Mis objetivos</h2><p>Metas independientes de tus tareas, con progreso verificable.</p></div><button className="primary-button" disabled={!connected || loading || busy} onClick={()=>setEditor({goal:null})}>Nueva meta</button></div>
    <button className="secondary-button" disabled={loading||busy} onClick={()=>setRevision(n=>n+1)}>Actualizar metas</button>
    {loading&&<p role="status" className="loading-message">Cargando metas…</p>}{error&&<p role="alert" className="storage-warning">{error}</p>}
    {!loading&&!error&&!goals.length&&<p className="panel loading-message">Todavía no tienes metas. Define un objetivo alcanzable para el periodo que prefieras.</p>}
    {!connected && <p className="storage-warning" role="status">Sin conexión. Las metas visibles pueden estar desactualizadas; la edición está desactivada.</p>}<div className="goals-grid">{!loading&&goals.map(goal=><article className="panel goal-card" key={goal.id}><div className="panel-heading"><h3>{goal.nombre}</h3><span className="badge state-pendiente">{goal.phase}</span></div><p>{goal.descripcion||'Sin descripción.'}</p><small>{goal.fechaInicio} al {goal.fechaFin}</small><div className="goal-progress" role="progressbar" aria-label={'Avance de '+goal.nombre} aria-valuenow={goal.percent} aria-valuemin={0} aria-valuemax={100}><span style={{width:goal.percent+'%'}}/></div><strong>{goal.completed} de {goal.objetivo} tareas · {goal.percent}%</strong>
      {goal.historyPartial&&<p className="calendar-subtitle">Este periodo puede tener historial incompleto anterior al registro de finalizaciones.</p>}
      <div className="modal-actions"><button className="secondary-button" disabled={busy || !connected} onClick={()=>setEditor({goal})}>Editar {goal.nombre}</button><button className="secondary-button" disabled={busy} onClick={()=>toggle(goal)}>{goal.activa?'Desactivar':'Reactivar'} {goal.nombre}</button></div>
    </article>)}</div><p className="calendar-subtitle">El historial conserva las metas finalizadas y desactivadas. No se fabrican mediciones de periodos anteriores al registro.</p>
    {editor&&<GoalForm goal={editor.goal} today={today} onSave={save} onClose={()=>setEditor(null)}/>}
  </section>
}
