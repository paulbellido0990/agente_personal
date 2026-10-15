import {attachAcademic,storeAcademic,academicTaskInput} from '../services/academicService.js'
import {tenant} from '../services/tenant.js'
import {HttpError} from '../errors.js'
import {randomUUID} from 'node:crypto'
export function createTaskRepository(db,userId='1'){
 const own=tenant(db,userId)
 const fields=['id','titulo','descripcion','categoria','prioridad','estado','fechaLimite','createdAt','updatedAt','recordatorio','completedAt','userId']
 const insert=db.prepare('INSERT INTO tasks('+fields.join(',')+') VALUES('+fields.map(()=>'?').join(',')+')')
 const get=id=>own.get('tasks',id)
 function transaction(action){
  const outer=db.isTransaction;if(!outer)db.exec('BEGIN IMMEDIATE')
  try{const result=action();if(!outer)db.exec('COMMIT');return result}catch(e){if(!outer)db.exec('ROLLBACK');throw e}
 }
 function log(task,kind,stamp){
  db.prepare('INSERT INTO task_events(id,taskId,kind,occurredAt,categoria,prioridad,fechaLimite,userId) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),task.id,kind,stamp,task.categoria,task.prioridad,task.fechaLimite,userId)
 }
 return {
  normalize:task=>({...task,academic:academicTaskInput(db,task.academic,task.id,userId)}),
  get:id=>{const task=get(id);return task?attachAcademic(db,task,userId):undefined},
  list:()=>own.list('tasks').map(t=>attachAcademic(db,t,userId)),
  insert(task,{imported=false}={}){
   return transaction(()=>{
    const completedAt=!imported&&task.estado==='completada'?task.createdAt:null
    const stored={...task,completedAt,userId}
    if(db.prepare('SELECT 1 FROM tasks WHERE id=?').get(task.id))throw new HttpError(409,'No se pudo utilizar ese identificador. Actualiza antes de reintentar.')
    insert.run(...fields.map(k=>stored[k]??null))
    if(stored.createdAt!=='1970-01-01T00:00:00.000Z')log(stored,'created',stored.createdAt)
    if(completedAt)log(stored,'completed',completedAt)
    storeAcademic(db,stored,userId)
    return attachAcademic(db,get(task.id),userId)
   })
  },
  update(task){
   return transaction(()=>{
    const previous=get(task.id);if(!previous)throw new HttpError(404,'No se encontró la tarea.')
    const completedAt=task.estado==='completada'?previous.estado==='completada'?previous.completedAt:task.updatedAt:null
    db.prepare('UPDATE tasks SET titulo=?,descripcion=?,categoria=?,prioridad=?,estado=?,fechaLimite=?,updatedAt=?,recordatorio=?,completedAt=? WHERE id=? AND userId=?').run(task.titulo,task.descripcion,task.categoria,task.prioridad,task.estado,task.fechaLimite,task.updatedAt,task.recordatorio??null,completedAt,task.id,userId)
    if(task.estado==='completada'&&previous.estado!=='completada')log(task,'completed',completedAt)
    storeAcademic(db,task,userId)
    return attachAcademic(db,get(task.id),userId)
   })
  },
  remove(id){
   if(db.prepare('SELECT 1 FROM task_academic WHERE projectId=? AND userId=?').get(id,userId))throw new HttpError(409,'El proyecto tiene hitos. Reasigna o elimina sus hitos antes de eliminarlo.')
   return own.remove('tasks',id).changes
  },
  transaction
 }
}
