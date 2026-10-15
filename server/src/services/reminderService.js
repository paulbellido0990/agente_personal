import {randomUUID} from 'node:crypto'
import {localDay,addDays} from '../../../shared/tasks.js'
import {reminderDate} from '../../../shared/calendar.js'
import {classOccurrences,occursOn} from '../../../shared/academic.js'
import {HttpError} from '../errors.js'
export function createReminderService(db,now=()=>new Date()){
 function generate(){
  const current=now(),today=localDay(current)
  const insert=db.prepare('INSERT INTO reminder_events(id,taskId,sessionId,fechaLimite,daysBefore,triggerDate,createdAt) VALUES(?,?,?,?,?,?,?) ON CONFLICT DO NOTHING')
  db.exec('BEGIN IMMEDIATE')
  try{
   for(const task of db.prepare("SELECT * FROM tasks WHERE estado!='completada' AND recordatorio IS NOT NULL AND fechaLimite IS NOT NULL").all()){
    const day=reminderDate(task)
    if(day&&day<=today)insert.run(randomUUID(),task.id,null,task.fechaLimite,task.recordatorio,day,current.toISOString())
   }
   const sessions=db.prepare("SELECT s.* FROM class_sessions s JOIN courses c ON c.id=s.courseId JOIN academic_terms a ON a.id=c.termId WHERE s.recordatorio IS NOT NULL AND c.estado='activa' AND a.estado!='archivado'").all()
   for(const session of classOccurrences(sessions,today,addDays(today,3))){
    const trigger=addDays(session.occurrence,-session.recordatorio)
    if(trigger<=today)insert.run(randomUUID(),null,session.id,session.occurrence,session.recordatorio,trigger,current.toISOString())
   }
   db.exec('COMMIT')
  }catch(error){db.exec('ROLLBACK');throw error}
  return today
 }
 function list(){
  const today=generate()
  const tasks=db.prepare("SELECT e.*,t.titulo,t.prioridad FROM reminder_events e JOIN tasks t ON t.id=e.taskId WHERE t.estado!='completada' AND t.fechaLimite=e.fechaLimite AND t.recordatorio=e.daysBefore AND e.triggerDate<=?").all(today)
  const classes=db.prepare("SELECT e.*,c.nombre AS titulo,'media' AS prioridad,s.horaInicio FROM reminder_events e JOIN class_sessions s ON s.id=e.sessionId JOIN courses c ON c.id=s.courseId JOIN academic_terms a ON a.id=c.termId WHERE e.triggerDate<=? AND e.fechaLimite>=? AND e.fechaLimite BETWEEN s.fechaInicio AND s.fechaFin AND s.recordatorio=e.daysBefore AND c.estado='activa' AND a.estado!='archivado'").all(today,today)
  return [...tasks,...classes.filter(e=>{const s=db.prepare('SELECT * FROM class_sessions WHERE id=?').get(e.sessionId);return occursOn(s,e.fechaLimite)}).map(e=>({...e,titulo:'Clase: '+e.titulo+' · '+e.horaInicio}))].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id))
 }
 function event(id){const found=list().find(e=>e.id===id);if(!found)throw new HttpError(404,'El recordatorio ya no está disponible.');return found}
 return {
  list,
  read(id){event(id);db.prepare('UPDATE reminder_events SET readAt=COALESCE(readAt,?) WHERE id=?').run(now().toISOString(),id);return {id,read:true}},
  claim(id){event(id);return {claimed:db.prepare('UPDATE reminder_events SET notifiedAt=? WHERE id=? AND notifiedAt IS NULL AND readAt IS NULL').run(now().toISOString(),id).changes===1}}
 }
}
