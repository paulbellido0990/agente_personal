import {useState} from 'react'
import Modal from './Modal'
import {weekdays} from '../../../shared/academic'
const termFields=[['nombre','Nombre del semestre','text',true],['fechaInicio','Fecha de inicio','date',true],['fechaFin','Fecha de finalización','date',true],['estado','Estado','select',true,{inactivo:'Inactivo',activo:'Activo',archivado:'Archivado'}]]
const courseFields=[['termId','Semestre','terms',true],['nombre','Nombre de asignatura','text',true],['codigo','Código','text'],['docentes','Docentes','textarea'],['creditos','Créditos','number'],['color','Color','color',true],['descripcion','Descripción','textarea'],['estado','Estado','select',true,{activa:'Activa',finalizada:'Finalizada',archivada:'Archivada'}]]
const sessionFields=[['courseId','Asignatura','courses',true],['dia','Día de la semana','select',true,Object.fromEntries(weekdays.map((d,i)=>[i+1,d]))],['horaInicio','Hora de inicio','time',true],['horaFin','Hora de finalización','time',true],['tipo','Tipo de sesión','select',true,{teoria:'Teoría',laboratorio:'Laboratorio',otra:'Otra'}],['aula','Aula o laboratorio','text'],['docente','Docente','text'],['fechaInicio','Vigencia desde','date',true],['fechaFin','Vigencia hasta','date',true],['recordatorio','Recordatorio de clase','select',false,{off:'Desactivado',0:'El mismo día',1:'Un día antes',3:'Tres días antes'}],['observaciones','Observaciones','textarea']]
export default function AcademicForm({kind,record,data,onSave,onClose}){
 const fields=kind==='terms'?termFields:kind==='courses'?courseFields:sessionFields
 const term=data.terms.find(t=>t.estado==='activo')||data.terms[0]
 const course=data.courses.find(c=>c.termId===term?.id)||data.courses[0]
 const defaults=kind==='terms'?{nombre:'',fechaInicio:'',fechaFin:'',estado:'inactivo'}:kind==='courses'?{termId:term?.id||'',nombre:'',codigo:'',docentes:'',creditos:'',color:'#8056D9',descripcion:'',estado:'activa'}:{courseId:course?.id||'',dia:'1',horaInicio:'08:00',horaFin:'09:00',tipo:'teoria',aula:'',docente:'',fechaInicio:term?.fechaInicio||'',fechaFin:term?.fechaFin||'',recordatorio:'off',observaciones:''}
 const [values,setValues]=useState(()=>Object.fromEntries(fields.map(([k])=>[k,record?.[k]??defaults[k]])))
 const [pending,setPending]=useState(false),[error,setError]=useState('')
 async function submit(e){
  e.preventDefault();if(pending)return
  const body={...values}
  if(kind==='courses')body.creditos=body.creditos===''?null:Number(body.creditos)
  if(kind==='sessions'){body.dia=Number(body.dia);body.recordatorio=body.recordatorio==='off'?null:Number(body.recordatorio)}
  setPending(true);setError('')
  const saved=await onSave(kind,body,record)
  setPending(false)
  if(saved)onClose()
  else setError('No se confirmó el guardado. Revisa el mensaje de la sección; tus campos se conservan.')
 }
 const titles={terms:'semestre',courses:'asignatura',sessions:'sesión de clase'}
 return <Modal title={(record?'Editar ':'Crear ')+titles[kind]} onClose={onClose} busy={pending}><form className="task-form" onSubmit={submit}><fieldset className="form-fields" disabled={pending}>
  <p>Campos con * obligatorios. No se asignan fechas automáticamente.</p>
  {fields.map(([key,label,type,required,options],index)=><label key={key}>{label}{required?' *':''}
   {type==='select'||type==='terms'||type==='courses'?<select data-initial-focus={index===0||undefined} required={required} value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})}>
    {type==='terms'||type==='courses'?<><option value="">Seleccionar</option>{data[type].map(row=><option key={row.id} value={row.id}>{row.nombre}</option>)}</>:Object.entries(options).map(([v,l])=><option key={v} value={v}>{l}</option>)}
   </select>:type==='textarea'?<textarea rows={3} maxLength={key==='docentes'?1000:5000} value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})}/>:<input data-initial-focus={index===0||undefined} type={type} required={required} maxLength={120} min={type==='number'?0:undefined} max={type==='number'?60:undefined} step={type==='number'?.5:undefined} value={values[key]} onChange={e=>setValues({...values,[key]:e.target.value})}/>}
  </label>)}
  {kind==='sessions'&&<p>America/Lima. Se repetirá solo el día indicado dentro de su vigencia. Los conflictos se advertirán sin eliminar sesiones. Avisos con ALIRA abierta; no hay push remoto.</p>}
  {error&&<p role="alert" className="storage-warning">{error}</p>}
  <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button">{pending?'Guardando…':'Guardar '+titles[kind]}</button></div>
 </fieldset></form></Modal>
}
