import {useState} from 'react'
export default function TeacherPicker({teachers,value,onChange,onRegister,legacy}){
 const [query,setQuery]=useState(''),[register,setRegister]=useState(false),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function create(){
  if(!name.trim()){setError('Escribe el nombre del docente.');return}
  setBusy(true);setError('')
  const result=await onRegister({nombre:name,email:'',notas:''})
  setBusy(false)
  if(result){onChange(result.id);setQuery('');setName('');setRegister(false)}
  else setError('No se pudo registrar el docente. Revisa el aviso de la sección.')
 }
 const displayed=teachers.filter(t=>t.id===value||t.nombre.toLocaleLowerCase('es-PE').includes(query.toLocaleLowerCase('es-PE')))
 return <section className="teacher-picker"><h3>Docente de esta sesión</h3><label>Buscar en mis docentes<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Docente registrado<select value={value||''} onChange={e=>onChange(e.target.value)}><option value="">Sin docente asignado</option>{displayed.map(t=><option key={t.id} value={t.id}>{t.nombre}</option>)}</select></label>
  {legacy&&!value&&<p>Texto anterior conservado: {legacy}. Selecciona un registro para relacionarlo de forma explícita.</p>}
  {!displayed.length&&<p>No hay docentes que coincidan. Puedes registrar uno en tu catálogo personal.</p>}
  <button type="button" className="secondary-button" onClick={()=>setRegister(!register)}>{register?'Cancelar registro de docente':'Registrar docente'}</button>
  {register&&<fieldset className="task-form" disabled={busy} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();create()}}}><legend>Nuevo docente personal</legend><label>Nombre del nuevo docente<input maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label><button type="button" className="secondary-button" onClick={create}>Registrar y seleccionar docente</button>{error&&<p className="storage-warning" role="alert">{error}</p>}</fieldset>}
 </section>
}
