import {HttpError} from '../errors.js'
const tables=new Set(['tasks','goals','task_events','academic_terms','courses','class_sessions','task_academic','reminder_events','teachers'])
export function tenant(db,userId='1'){
 if(typeof userId!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(userId))throw new HttpError(401,'Sesión no válida.')
 const check=table=>{if(!tables.has(table))throw new Error('Tabla privada no admitida.');return table}
 return {
  id:userId,
  get(table,id,key='id'){check(table);if(!['id','taskId'].includes(key))throw new Error('Clave no admitida.');return db.prepare('SELECT * FROM '+table+' WHERE '+key+'=? AND userId=?').get(id,userId)},
  list(table){return db.prepare('SELECT * FROM '+check(table)+' WHERE userId=?').all(userId)},
  remove(table,id,key='id'){check(table);if(!['id','taskId'].includes(key))throw new Error('Clave no admitida.');return db.prepare('DELETE FROM '+table+' WHERE '+key+'=? AND userId=?').run(id,userId)},
 }
}
