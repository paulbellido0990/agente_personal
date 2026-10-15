import {useState} from 'react'
import {taskApi} from '../services/taskApi'
import useRemote from '../hooks/useRemote'
import AnnouncementCards from './AnnouncementCards'
const statusLabels={abierta:'Abierta',revision:'En revisión',resuelta:'Resuelta',cerrada:'Cerrada'}
export default function CommunicationsPage({resource,account,connected,onChanged,initialFilter='',administrative=false}){
 const [filter,setFilter]=useState(initialFilter),[selected,setSelected]=useState(''),[reply,setReply]=useState(''),[subject,setSubject]=useState(''),[body,setBody]=useState(''),[type,setType]=useState('consulta'),[recipient,setRecipient]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false)
 const detail=useRemote('/communications/threads/'+encodeURIComponent(selected),!!selected)
 const users=useRemote('/control/users',administrative)
 const data=resource.data
 const list=(data?.threads||[]).filter(t=>!filter||t.kind===filter)
 async function perform(action){
  if(busy||!connected)return
  setBusy(true);setError('')
  try{await action();await resource.refresh();if(selected)await detail.refresh();onChanged?.();return true}
  catch(e){setError(e.message);return false}
  finally{setBusy(false)}
 }
 async function create(e){
  e.preventDefault()
  const kind=administrative&&filter!=='soporte'?'mensaje':'soporte'
  const ok=await perform(async()=>{const t=await taskApi.platform('/communications/threads',{method:'POST',body:{subject,body,kind,...(kind==='mensaje'?{userId:recipient}:{type})}});setSelected(t.id)})
  if(ok){setSubject('');setBody('')}
 }
 const open=async t=>{setSelected(t.id);setReply('');await perform(()=>taskApi.platform('/notifications/'+(t.kind==='soporte'?'soporte':'mensaje')+'/'+t.id+'/read',{method:'PATCH',body:{}}))}
 return <section className="platform-page"><div className="panel platform-intro"><h2>{administrative?'Comunicaciones administrativas':'Comunicaciones y soporte'}</h2><p>Mensajes HTTP con actualización cada 15 segundos. Los mensajes y solicitudes de soporte se comparten explícitamente con el administrador.</p><button className="secondary-button" onClick={()=>resource.refresh()}>Actualizar comunicaciones</button></div>
  {!administrative&&<AnnouncementCards announcements={data?.announcements} onRead={id=>perform(()=>taskApi.platform('/notifications/anuncio/'+id+'/read',{method:'PATCH',body:{}}))}/>}
  {data?.notice?.notice&&<p className="panel communication-card">{data.notice.notice}</p>}
  {(resource.error||error)&&<p role="alert" className="storage-warning">{error||resource.error}</p>}
  {!administrative&&<div className="academic-tabs"><button className="secondary-button" aria-pressed={!filter} onClick={()=>setFilter('')}>Todas las conversaciones</button><button className="secondary-button" aria-pressed={filter==='mensaje'} onClick={()=>setFilter('mensaje')}>Mensajes</button><button className="secondary-button" aria-pressed={filter==='soporte'} onClick={()=>setFilter('soporte')}>Soporte</button></div>}
  <div className="communications-grid"><section className="panel communication-card"><h3>Conversaciones</h3><ul className="thread-list">{list.map(t=><li key={t.id}><button aria-pressed={selected===t.id} onClick={()=>open(t)}><strong>{t.subject}</strong><span>{t.username||'Administración'} · {t.kind==='soporte'?statusLabels[t.status]:'Mensaje'} · {t.unread} sin leer</span></button></li>)}</ul>{!list.length&&<p>No hay conversaciones en esta vista.</p>}</section>
  <section className="panel communication-card" aria-live="polite">{!selected?<p>Selecciona una conversación para consultar su historial.</p>:detail.loading?<p>Cargando conversación…</p>:detail.error?<p role="alert">{detail.error}</p>:detail.data&&<>
   <h3>{detail.data.thread.subject}</h3><ul className="message-list">{detail.data.messages.map(m=><li key={m.id} className={m.authorId===account.id?'outgoing':''}><strong>{m.username}</strong><p className="message-body">{m.body}</p><time dateTime={m.createdAt}>{new Date(m.createdAt).toLocaleString('es-PE',{timeZone:'America/Lima'})}</time>{m.authorId===account.id&&<small>{m.read?'Leído por destinatario':'Enviado'}</small>}</li>)}</ul>
   <button className="secondary-button" disabled={busy||!connected} onClick={()=>perform(()=>taskApi.platform('/notifications/'+(detail.data.thread.kind==='soporte'?'soporte':'mensaje')+'/'+selected+'/read',{method:'PATCH',body:{}}))}>Marcar conversación leída</button>
   <form className="task-form" onSubmit={async e=>{e.preventDefault();if(await perform(()=>taskApi.platform('/communications/threads/'+selected+'/messages',{method:'POST',body:{body:reply}})))setReply('')}}><label>Respuesta<textarea required maxLength={10000} value={reply} onChange={e=>setReply(e.target.value)}/></label><button className="primary-button" disabled={busy||!connected}>Enviar respuesta</button></form>
   {administrative&&detail.data.thread.kind==='soporte'&&<label className="scope-filter">Estado de soporte<select disabled={busy||!connected} value={detail.data.thread.status} onChange={e=>perform(()=>taskApi.platform('/communications/threads/'+selected+'/status',{method:'PATCH',body:{status:e.target.value},headers:{'If-Match':'"'+detail.data.thread.version+'"'}}))}>{Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>}
  </>}</section></div>
  {(!administrative||filter!=='soporte')&&<section className="panel communication-card"><h3>{administrative&&filter!=='soporte'?'Enviar mensaje a un usuario':'Nueva solicitud de soporte'}</h3><form className="task-form" onSubmit={create}>
   {administrative&&filter!=='soporte'?<label>Destinatario<select required value={recipient} onChange={e=>setRecipient(e.target.value)}><option value="">Seleccionar usuario</option>{users.data?.filter(u=>u.id!==account.id&&u.status==='activo').map(u=><option value={u.id} key={u.id}>{u.username}</option>)}</select></label>:<label>Tipo de solicitud<select value={type} onChange={e=>setType(e.target.value)}><option value="error">Error de la aplicación</option><option value="acceso">Problemas de acceso</option><option value="sugerencia">Sugerencia</option><option value="consulta">Consulta general</option></select></label>}
   <label>Asunto<input required maxLength={120} value={subject} onChange={e=>setSubject(e.target.value)}/></label><label>Mensaje<textarea required maxLength={10000} value={body} onChange={e=>setBody(e.target.value)}/></label><button className="primary-button" disabled={busy||!connected}>Enviar solicitud o mensaje</button>
  </form></section>}
  {!administrative&&<section className="panel communication-card"><h3>Privacidad y conservación</h3><p>Tus tareas, cursos y horarios son privados. ALIRA Control muestra cantidades agregadas y fechas de acceso verificables; no registra pulsaciones ni navegación detallada. Las comunicaciones con administración y los recursos que compartas son accesibles a sus destinatarios. Las cuentas desactivadas conservan sus datos.</p><p>Mensajes, recibos y auditoría se conservan hasta una revisión de retención autorizada; no se eliminan automáticamente. El operador custodia SQLite y sus respaldos: no hay cifrado de extremo a extremo.</p></section>}
 </section>
}
