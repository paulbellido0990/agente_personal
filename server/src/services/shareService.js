import {randomUUID} from 'node:crypto'
import {tenant} from './tenant.js'
import {HttpError} from '../errors.js'
import {input,enumeration,transaction} from './platformValidation.js'
const notFound=()=>{throw new HttpError(404,'Recurso compartido no disponible.')}
export function createShareService(db,userId,now=()=>new Date()){
 const own=tenant(db,userId)
 function resource(ownerId,kind,id){
  const scope=tenant(db,ownerId),table=kind==='curso'?'courses':kind==='horario'?'class_sessions':'tasks'
  const item=scope.get(table,id)
  if(!item)return notFound()
  if(kind==='proyecto'){
   const a=scope.get('task_academic',id,'taskId')
   if(a?.tipo!=='proyecto')return notFound()
   // El consentimiento para un proyecto no comparte automáticamente sus hitos.
   return {id:item.id,titulo:item.titulo,descripcion:item.descripcion,estado:item.estado,prioridad:item.prioridad,fechaLimite:item.fechaLimite}
  }
  if(kind==='curso')return {id:item.id,nombre:item.nombre,codigo:item.codigo,creditos:item.creditos,color:item.color,descripcion:item.descripcion}
  const course=scope.get('courses',item.courseId)
  return {id:item.id,asignatura:course?.nombre||'',dia:item.dia,horaInicio:item.horaInicio,horaFin:item.horaFin,tipo:item.tipo,aula:item.aula,fechaInicio:item.fechaInicio,fechaFin:item.fechaFin}
 }
 return {
  list(){
   return db.prepare('SELECT r.*,u.username AS ownerName,v.username AS recipientName FROM resource_shares r JOIN users u ON u.id=r.ownerId JOIN users v ON v.id=r.recipientId WHERE r.ownerId=? OR r.recipientId=? ORDER BY r.createdAt DESC').all(userId,userId).map(r=>{let shared=null;if(!r.revokedAt){try{shared=resource(r.ownerId,r.kind,r.resourceId)}catch(e){if(e.status!==404)throw e}}return {...r,resource:shared}})
  },
  create(body){
   input(body,['recipient','kind','resourceId'])
   const kind=enumeration(body.kind,['curso','horario','proyecto'],'recurso')
   if(typeof body.recipient!=='string'||typeof body.resourceId!=='string')throw new HttpError(400,'Revisa destinatario y recurso.')
   resource(userId,kind,body.resourceId)
   const recipient=db.prepare("SELECT id FROM users WHERE username=? COLLATE NOCASE AND status='activo'").get(body.recipient)
   if(!recipient||recipient.id===userId)throw new HttpError(400,'Selecciona otra cuenta activa por su nombre de usuario.')
   return transaction(db,()=>{
    db.prepare('INSERT INTO resource_shares(id,ownerId,recipientId,kind,resourceId,createdAt) VALUES(?,?,?,?,?,?) ON CONFLICT(ownerId,recipientId,kind,resourceId) DO UPDATE SET revokedAt=NULL,createdAt=excluded.createdAt').run(randomUUID(),userId,recipient.id,kind,body.resourceId,now().toISOString())
    return {shared:true}
   })
  },
  revoke(id){
   const r=db.prepare('SELECT * FROM resource_shares WHERE id=? AND ownerId=?').get(id,userId)
   if(!r)notFound()
   db.prepare('UPDATE resource_shares SET revokedAt=COALESCE(revokedAt,?) WHERE id=? AND ownerId=?').run(now().toISOString(),id,userId)
   return {revoked:true}
  },
  get(id){
   const r=db.prepare('SELECT * FROM resource_shares WHERE id=? AND revokedAt IS NULL AND (ownerId=? OR recipientId=?)').get(id,userId,userId)
   if(!r)notFound()
   return resource(r.ownerId,r.kind,r.resourceId)
  },
  ownedResources(){return {courses:own.list('courses').map(c=>({id:c.id,nombre:c.nombre})),sessions:own.list('class_sessions').map(s=>({id:s.id,nombre:s.dia+' · '+s.horaInicio})),projects:own.list('tasks').filter(t=>own.get('task_academic',t.id,'taskId')?.tipo==='proyecto').map(t=>({id:t.id,nombre:t.titulo}))}}
 }
}
