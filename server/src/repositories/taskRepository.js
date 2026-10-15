import {attachAcademic,storeAcademic,academicTaskInput} from '../services/academicService.js'
import {HttpError} from '../errors.js'
import { randomUUID } from 'node:crypto'
export function createTaskRepository(db) {
  const fields = ['id','titulo','descripcion','categoria','prioridad','estado','fechaLimite','createdAt','updatedAt','recordatorio','completedAt']
  const insert = db.prepare('INSERT INTO tasks (' + fields.join(',') + ') VALUES (?,?,?,?,?,?,?,?,?,?,?)')
  const get = db.prepare('SELECT * FROM tasks WHERE id=?')
  const update = db.prepare('UPDATE tasks SET titulo=?,descripcion=?,categoria=?,prioridad=?,estado=?,fechaLimite=?,updatedAt=?,recordatorio=?,completedAt=? WHERE id=?')
  function transaction(action) {
    // Importación usa una transacción de lote; cada tarea participa en ella.
    const outer = db.isTransaction
    if (!outer) db.exec('BEGIN IMMEDIATE')
    try { const result=action(); if (!outer) db.exec('COMMIT'); return result }
    catch(error) { if (!outer) db.exec('ROLLBACK'); throw error }
  }
  function log(task,kind,occurredAt) {
    db.prepare('INSERT INTO task_events (id,taskId,kind,occurredAt,categoria,prioridad,fechaLimite) VALUES (?,?,?,?,?,?,?)')
      .run(randomUUID(),task.id,kind,occurredAt,task.categoria,task.prioridad,task.fechaLimite)
  }
  return {
    normalize:task=>({...task,academic:academicTaskInput(db,task.academic,task.id)}),
    get:id=>{const task=get.get(id);return task?attachAcademic(db,task):undefined},
    list:()=>db.prepare('SELECT * FROM tasks').all().map(t=>attachAcademic(db,t)),
    insert(task,{ imported=false }={}) {
      return transaction(()=>{
        const completedAt=!imported && task.estado==='completada' ? task.createdAt : null
        const stored={...task,completedAt}
        insert.run(...fields.map(field=>stored[field]??null))
        if(stored.createdAt!=='1970-01-01T00:00:00.000Z')log(stored,'created',stored.createdAt)
        if(completedAt) log(stored,'completed',completedAt)
        storeAcademic(db,task)
        return attachAcademic(db,get.get(task.id))
      })
    },
    update(task) {
      return transaction(()=>{
        const previous=get.get(task.id)
        const completedAt=task.estado==='completada' ? previous.estado==='completada' ? previous.completedAt : task.updatedAt : null
        update.run(task.titulo,task.descripcion,task.categoria,task.prioridad,task.estado,task.fechaLimite,task.updatedAt,task.recordatorio??null,completedAt,task.id)
        if(task.estado==='completada' && previous.estado!=='completada') log(task,'completed',completedAt)
        storeAcademic(db,task)
        return attachAcademic(db,get.get(task.id))
      })
    },
    remove:id=>{if(db.prepare('SELECT 1 FROM task_academic WHERE projectId=?').get(id))throw new HttpError(409,'El proyecto tiene hitos. Reasigna o elimina sus hitos antes de eliminarlo.');return db.prepare('DELETE FROM tasks WHERE id=?').run(id).changes},
    transaction,
  }
}
