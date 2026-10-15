import {randomUUID} from 'node:crypto'
import {HttpError} from '../errors.js'
import {validDate,localDay,addDays} from '../../../shared/tasks.js'
import {activityLabels,evaluationLabels,validTime,sessionConflicts,projectProgress} from '../../../shared/academic.js'
const tables={terms:'academic_terms',courses:'courses',sessions:'class_sessions'}
export const academicTables=tables
function fail(message){throw new HttpError(400,message)}
function object(input,allowed){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!allowed.includes(k)))fail('Campos académicos no válidos.')
}
function text(value,name,max=120,required=false){
 if(value==null&&!required)return ''
 if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))fail('Revisa '+name+'.')
 return value.trim()
}
function dates(input){
 if(!validDate(input.fechaInicio)||!validDate(input.fechaFin)||input.fechaInicio>input.fechaFin)fail('Indica fechas válidas de inicio y fin en orden.')
}
function row(db,table,id){
 if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(id))fail('Identificador académico no válido.')
 const record=db.prepare('SELECT * FROM '+table+' WHERE id=?').get(id)
 if(!record)throw new HttpError(404,'El registro académico no existe.')
 return record
}
export function academicTaskInput(db,input,taskId){
 if(input===null||input===undefined)return null
 object(input,['courseId','tipo','projectId','detalles'])
 row(db,'courses',input.courseId)
 if(!Object.hasOwn(activityLabels,input.tipo))fail('Selecciona un tipo de actividad.')
 const projectId=input.projectId||null
 if(projectId){
  if(typeof projectId!=='string')fail('Proyecto no válido.')
  const project=db.prepare("SELECT a.*,t.estado FROM task_academic a JOIN tasks t ON t.id=a.taskId WHERE a.taskId=? AND a.tipo='proyecto'").get(projectId)
  if(!project||project.courseId!==input.courseId||taskId===projectId||input.tipo!=='hito')fail('El hito requiere un proyecto de la misma asignatura.')
 }
 if(input.tipo==='hito'&&!projectId)fail('Selecciona el proyecto del hito.')
 const details=input.detalles||{}
 object(details,['evaluacion','hora','aula','temas','numero','fechaRealizacion','fechaInicio','integrantes','repositorio','recursos','entregables','observaciones'])
 const normalized={}
 for(const key of Object.keys(details)){
  normalized[key]=text(details[key],key,['temas','entregables','observaciones'].includes(key)?5000:1000)
 }
 if(normalized.evaluacion&&!Object.hasOwn(evaluationLabels,normalized.evaluacion))fail('Tipo de evaluación no válido.')
 if(normalized.hora&&!validTime(normalized.hora))fail('Hora de evaluación no válida.')
 for(const k of ['fechaRealizacion','fechaInicio'])if(normalized[k]&&!validDate(normalized[k]))fail('Fecha académica no válida.')
 for(const k of ['repositorio','recursos'])if(normalized[k]){
  const links=normalized[k].split(/\r?\n/).filter(Boolean)
  for(const link of links){let url;try{url=new URL(link)}catch{fail('Los enlaces deben ser direcciones HTTP o HTTPS válidas.')}if(!['https:','http:'].includes(url.protocol))fail('Solo se admiten enlaces HTTP o HTTPS.')}
 }
 if(taskId){
  const children=db.prepare('SELECT courseId FROM task_academic WHERE projectId=?').all(taskId)
  if(children.length&&(input.tipo!=='proyecto'||children.some(c=>c.courseId!==input.courseId)))throw new HttpError(409,'El proyecto tiene hitos: conserva su asignatura y tipo.')
 }
 return {courseId:input.courseId,tipo:input.tipo,projectId,detalles:normalized}
}
export function attachAcademic(db,task){
 const item=db.prepare('SELECT * FROM task_academic WHERE taskId=?').get(task.id)
 return {...task,academic:item?{courseId:item.courseId,tipo:item.tipo,projectId:item.projectId,detalles:JSON.parse(item.detalles)}:null}
}
export function storeAcademic(db,task){
 if(task.academic===undefined)return
 const a=academicTaskInput(db,task.academic,task.id)
 if(a?.detalles.fechaInicio&&task.fechaLimite&&a.detalles.fechaInicio>task.fechaLimite)fail('El proyecto debe comenzar antes de su fecha límite.')
 if(a?.detalles.fechaRealizacion&&task.fechaLimite&&a.detalles.fechaRealizacion>task.fechaLimite)fail('La entrega de laboratorio no puede ser anterior a su realización.')
 if(!a){
  if(db.prepare('SELECT 1 FROM task_academic WHERE projectId=?').get(task.id))throw new HttpError(409,'El proyecto tiene hitos asociados.')
  db.prepare('DELETE FROM task_academic WHERE taskId=?').run(task.id)
 }else db.prepare('INSERT INTO task_academic(taskId,courseId,tipo,projectId,detalles) VALUES (?,?,?,?,?) ON CONFLICT(taskId) DO UPDATE SET courseId=excluded.courseId,tipo=excluded.tipo,projectId=excluded.projectId,detalles=excluded.detalles').run(task.id,a.courseId,a.tipo,a.projectId,JSON.stringify(a.detalles))
}
export function createAcademicService(db,now=()=>new Date()){
 function transaction(fn){const outer=db.isTransaction;if(!outer)db.exec('BEGIN IMMEDIATE');try{const result=fn();if(!outer)db.exec('COMMIT');return result}catch(e){if(!outer)db.exec('ROLLBACK');throw e}}
 function normalize(kind,input,previous){
  if(kind==='terms'){
   object(input,['nombre','fechaInicio','fechaFin','estado']);dates(input)
   if(!['activo','inactivo','archivado'].includes(input.estado))fail('Estado de semestre no válido.')
   if(previous){
    const children=db.prepare('SELECT s.* FROM class_sessions s JOIN courses c ON c.id=s.courseId WHERE c.termId=?').all(previous.id)
    if(children.some(s=>s.fechaInicio<input.fechaInicio||s.fechaFin>input.fechaFin))fail('Las fechas deben contener la vigencia de las sesiones existentes.')
   }
   return {nombre:text(input.nombre,'nombre',120,true),fechaInicio:input.fechaInicio,fechaFin:input.fechaFin,estado:input.estado}
  }
  if(kind==='courses'){
   object(input,['termId','nombre','codigo','docentes','creditos','color','descripcion','estado'])
   row(db,'academic_terms',input.termId)
   if(!['activa','finalizada','archivada'].includes(input.estado))fail('Estado de asignatura no válido.')
   if(typeof input.color!=='string'||!/^#[0-9a-fA-F]{6}$/.test(input.color))fail('Color de asignatura no válido.')
   const creditos=input.creditos==null||input.creditos===''?null:input.creditos
   if(creditos!==null&&(typeof creditos!=='number'||!Number.isFinite(creditos)||creditos<0||creditos>60))fail('Créditos: indica un número entre 0 y 60.')
   if(previous&&previous.termId!==input.termId&&db.prepare('SELECT 1 FROM class_sessions WHERE courseId=?').get(previous.id))fail('Conserva el semestre de una asignatura con horario registrado.')
   return {termId:input.termId,nombre:text(input.nombre,'nombre',120,true),codigo:text(input.codigo,'código',80),docentes:text(input.docentes,'docentes',1000),creditos,color:input.color,descripcion:text(input.descripcion,'descripción',5000),estado:input.estado}
  }
  object(input,['courseId','dia','horaInicio','horaFin','tipo','aula','docente','observaciones','fechaInicio','fechaFin','recordatorio'])
  const course=row(db,'courses',input.courseId),term=row(db,'academic_terms',course.termId)
  dates(input)
  if(input.fechaInicio<term.fechaInicio||input.fechaFin>term.fechaFin)fail('La vigencia debe estar dentro de las fechas del semestre.')
  if(!Number.isInteger(input.dia)||input.dia<1||input.dia>7||!validTime(input.horaInicio)||!validTime(input.horaFin)||input.horaInicio>=input.horaFin)fail('Revisa el día y las horas de clase.')
  if(!['teoria','laboratorio','otra'].includes(input.tipo))fail('Tipo de sesión no válido.')
  if(input.recordatorio!=null&&![0,1,3].includes(input.recordatorio))fail('Recordatorio de clase no válido.')
  return {courseId:input.courseId,dia:input.dia,horaInicio:input.horaInicio,horaFin:input.horaFin,tipo:input.tipo,aula:text(input.aula,'aula',120),docente:text(input.docente,'docente',120),observaciones:text(input.observaciones,'observaciones',5000),fechaInicio:input.fechaInicio,fechaFin:input.fechaFin,recordatorio:input.recordatorio??null}
 }
 function save(kind,input,id){
  return transaction(()=>{
   const table=tables[kind];if(!table)fail('Tipo de registro no válido.')
   const previous=id?row(db,table,id):null
   const record=normalize(kind,input,previous),timestamp=now().toISOString()
   if(kind==='terms'&&record.estado==='activo')db.prepare("UPDATE academic_terms SET estado='inactivo',version=version+1,updatedAt=? WHERE estado='activo' AND id!=?").run(timestamp,id||'')
   if(previous){
    const keys=Object.keys(record)
    db.prepare('UPDATE '+table+' SET '+keys.map(k=>k+'=?').join(',')+',updatedAt=?,version=version+1 WHERE id=?').run(...keys.map(k=>record[k]),timestamp,id)
   }else{
    id=randomUUID()
    const data={...record,id,createdAt:timestamp,updatedAt:timestamp},keys=Object.keys(data)
    db.prepare('INSERT INTO '+table+' ('+keys.join(',')+') VALUES ('+keys.map(()=>'?').join(',')+')').run(...keys.map(k=>data[k]))
   }
   const saved=row(db,table,id)
   return kind==='sessions'?{...saved,conflicts:sessionConflicts(saved,db.prepare('SELECT * FROM class_sessions').all()).map(s=>s.id)}:saved
  })
 }
 return {
  save,
  snapshot(){
   const terms=db.prepare('SELECT * FROM academic_terms ORDER BY fechaInicio DESC').all(),courses=db.prepare('SELECT * FROM courses ORDER BY nombre').all()
   const sessions=db.prepare('SELECT * FROM class_sessions ORDER BY dia,horaInicio').all()
   const tasks=db.prepare('SELECT * FROM tasks').all().map(t=>attachAcademic(db,t))
   const today=localDay(now()),academic=tasks.filter(t=>t.academic)
   const statistics=courses.map(c=>{
    const items=academic.filter(t=>t.academic.courseId===c.id),done=items.filter(t=>t.estado==='completada')
    return {courseId:c.id,total:items.length,pendientes:items.length-done.length,completadas:done.length,percent:items.length?Math.round(done.length/items.length*100):0,laboratoriosCompletados:done.filter(t=>t.academic.tipo==='laboratorio').length,examenesProximos:items.filter(t=>t.academic.tipo==='examen'&&t.estado!=='completada'&&t.fechaLimite>=today&&t.fechaLimite<=addDays(today,30)).length,proyectosActivos:items.filter(t=>t.academic.tipo==='proyecto'&&t.estado!=='completada').length}
   })
   const load={}
   for(const t of academic.filter(t=>t.fechaLimite&&t.estado!=='completada'))load[t.fechaLimite]=(load[t.fechaLimite]||0)+1
   return {terms,courses,sessions:sessions.map(s=>({...s,conflicts:sessionConflicts(s,sessions).map(c=>c.id)})),statistics,load:Object.entries(load).sort(([a],[b])=>a.localeCompare(b)).map(([fecha,total])=>({fecha,total})),projects:academic.filter(t=>t.academic.tipo==='proyecto').map(t=>({id:t.id,...projectProgress(tasks,t.id)}))}
  },
  removeSession(id){row(db,'class_sessions',id);db.prepare('DELETE FROM class_sessions WHERE id=?').run(id)}
 }
}
