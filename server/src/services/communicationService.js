import {randomUUID} from 'node:crypto'
import {HttpError} from '../errors.js'
import {input,text,enumeration,transaction,version} from './platformValidation.js'
export function createCommunicationService(db,account,now=()=>new Date()){
 const userId=account.id,isAdmin=userId==='1'&&account.role==='administrador',stamp=()=>now().toISOString()
 function thread(id){
  const t=db.prepare('SELECT t.*,s.type,s.status,s.version FROM message_threads t LEFT JOIN support_tickets s ON s.threadId=t.id WHERE t.id=? AND (t.userId=? OR ?=1)').get(id,userId,+isAdmin)
  if(!t)throw new HttpError(404,'Conversación no disponible.')
  return t
 }
 function announcements(){
  // Los grupos todos/usuarios incluyen también cuentas activadas después de publicar.
  db.prepare("INSERT INTO announcement_recipients(announcementId,userId) SELECT id,? FROM announcements WHERE audience='todos' OR (audience='usuarios' AND ?='usuario') ON CONFLICT DO NOTHING").run(userId,account.role)
  return db.prepare("SELECT a.*,r.readAt FROM announcements a JOIN announcement_recipients r ON r.announcementId=a.id WHERE r.userId=? AND a.published=1 AND a.publishAt<=? AND (a.expiresAt IS NULL OR a.expiresAt>?) AND (a.audience='todos' OR (a.audience='usuarios' AND ?='usuario') OR (a.audience='seleccionados' AND r.selected=1)) ORDER BY a.pinned DESC,a.publishAt DESC").all(userId,stamp(),stamp(),account.role)
 }
 function threads(){
  return db.prepare('SELECT t.*,u.username,s.type,s.status,s.version FROM message_threads t JOIN users u ON u.id=t.userId LEFT JOIN support_tickets s ON s.threadId=t.id WHERE t.userId=? OR ?=1 ORDER BY t.updatedAt DESC,t.id').all(userId,+isAdmin).map(t=>{
   const read=db.prepare('SELECT * FROM message_reads WHERE threadId=? AND userId=?').get(t.id,userId)
   const unread=db.prepare('SELECT count(*) n FROM messages WHERE threadId=? AND authorId!=? AND rowid>?').get(t.id,userId,read?.lastSequence||0).n
   return {...t,unread,readAt:unread?null:read?.lastReadAt||null}
  })
 }
 function markThread(id){
  thread(id)
  db.prepare('INSERT INTO message_reads(threadId,userId,lastReadAt,lastSequence) VALUES(?,?,?,(SELECT COALESCE(max(rowid),0) FROM messages WHERE threadId=?)) ON CONFLICT(threadId,userId) DO UPDATE SET lastReadAt=excluded.lastReadAt,lastSequence=excluded.lastSequence').run(id,userId,stamp(),id)
 }
 return {
  announcements,threads,
  snapshot(){return {announcements:announcements(),threads:threads(),notice:db.prepare('SELECT name,notice FROM platform_settings WHERE id=1').get()}},
  readAnnouncement(id){
   if(!announcements().some(a=>a.id===id))throw new HttpError(404,'Anuncio no disponible.')
   db.prepare('UPDATE announcement_recipients SET readAt=COALESCE(readAt,?) WHERE announcementId=? AND userId=?').run(stamp(),id,userId)
   return {read:true}
  },
  messages(id){
   const t=thread(id),otherId=isAdmin?t.userId:'1'
   const read=db.prepare('SELECT lastSequence FROM message_reads WHERE threadId=? AND userId=?').get(id,otherId)?.lastSequence||0
   return {thread:t,messages:db.prepare('SELECT m.*,u.username,m.rowid AS sequence FROM messages m JOIN users u ON u.id=m.authorId WHERE m.threadId=? ORDER BY m.rowid').all(id).map(m=>({...m,read:m.sequence<=read}))}
  },
  markThread,
  create(body){
   input(body,['subject','body','kind','userId','type'])
   const kind=enumeration(body.kind,['mensaje','soporte'],'tipo'),subject=text(body.subject,'asunto'),content=text(body.body,'mensaje',10000)
   if(!isAdmin&&(kind!=='soporte'||body.userId!==undefined))throw new HttpError(403,'Solo puedes abrir solicitudes propias de soporte.')
   const recipient=kind==='soporte'?userId:body.userId
   if(typeof recipient!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(recipient))throw new HttpError(400,'Selecciona un destinatario válido.')
   if(kind==='mensaje'&&(recipient==='1'||!db.prepare("SELECT 1 FROM users WHERE id=? AND status='activo'").get(recipient)))throw new HttpError(400,'Selecciona un destinatario activo.')
   const type=kind==='soporte'?enumeration(body.type,['error','acceso','sugerencia','consulta'],'tipo de soporte'):null
   return transaction(db,()=>{
    const id=randomUUID()
    db.prepare('INSERT INTO message_threads VALUES(?,?,?,?,?,?)').run(id,recipient,subject,kind,stamp(),stamp())
    if(type)db.prepare("INSERT INTO support_tickets(threadId,type,status) VALUES(?,?,'abierta')").run(id,type)
    db.prepare('INSERT INTO messages VALUES(?,?,?,?,?)').run(randomUUID(),id,userId,content,stamp())
    markThread(id)
    return thread(id)
   })
  },
  reply(id,body){
   input(body,['body']);thread(id)
   const content=text(body.body,'mensaje',10000)
   return transaction(db,()=>{
    db.prepare('INSERT INTO messages VALUES(?,?,?,?,?)').run(randomUUID(),id,userId,content,stamp())
    db.prepare('UPDATE message_threads SET updatedAt=? WHERE id=?').run(stamp(),id)
    markThread(id);return this.messages(id)
   })
  },
  status(id,body,header){
   if(!isAdmin)throw new HttpError(403,'Solo el administrador puede actualizar solicitudes.')
   input(body,['status']);const status=enumeration(body.status,['abierta','revision','resuelta','cerrada'],'estado')
   return transaction(db,()=>{
    const t=thread(id)
    if(t.kind!=='soporte')throw new HttpError(400,'La conversación no es de soporte.')
    version(t,header)
    db.prepare('UPDATE support_tickets SET status=?,version=version+1 WHERE threadId=?').run(status,id)
    db.prepare('UPDATE message_threads SET updatedAt=? WHERE id=?').run(stamp(),id)
    return thread(id)
   })
  },
  notifications(){
   const a=announcements().map(a=>({id:a.id,type:'anuncio',titulo:a.title,createdAt:a.publishAt,readAt:a.readAt,importance:a.importance}))
   const m=threads().map(t=>({id:t.id,type:t.kind==='soporte'?'soporte':'mensaje',titulo:t.subject,createdAt:t.updatedAt,readAt:t.readAt,unread:t.unread}))
   return [...a,...m].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
  }
 }
}
