import {randomUUID,randomBytes} from 'node:crypto'
import {digest} from './authService.js'
import {HttpError} from '../errors.js'
import {input,text,enumeration,instant,transaction,version} from './platformValidation.js'
export function createAdminService(db,now=()=>new Date()){
 const stamp=()=>now().toISOString()
 function audit(actorId,action,subjectId=null){db.prepare('INSERT INTO admin_audit_log VALUES(?,?,?,?,?)').run(randomUUID(),actorId,action,subjectId,stamp())}
 function user(id){const result=db.prepare('SELECT id,username,role,status,createdAt,updatedAt,lastLoginAt FROM users WHERE id=?').get(id);if(!result)throw new HttpError(404,'Cuenta no disponible.');return result}
 function issue(id,kind){
  db.prepare('UPDATE user_invitations SET usedAt=COALESCE(usedAt,?) WHERE userId=?').run(stamp(),id)
  const token=randomBytes(32).toString('hex'),expiresAt=new Date(now().getTime()+(kind==='recuperacion'?1:48)*3600000).toISOString()
  db.prepare('INSERT INTO user_invitations(id,userId,tokenHash,kind,createdAt,expiresAt) VALUES(?,?,?,?,?,?)').run(randomUUID(),id,digest(token),kind,stamp(),expiresAt)
  return {userId:id,token,expiresAt,username:user(id).username}
 }
 return {
  audit,
  users(){return db.prepare("SELECT id,username,role,status,createdAt,updatedAt,lastLoginAt,(SELECT count(*) FROM tasks t WHERE t.userId=u.id) AS taskCount,(SELECT count(*) FROM courses c WHERE c.userId=u.id) AS courseCount FROM users u WHERE username IS NOT NULL ORDER BY createdAt").all()},
  invite(body,actorId){
   input(body,['username'])
   const username=text(body.username,'usuario',80)
   if(!/^[a-zA-Z0-9._-]{3,80}$/.test(username))throw new HttpError(400,'El usuario admite de 3 a 80 letras, números, puntos, guiones o guiones bajos.')
   if(db.prepare('SELECT 1 FROM users WHERE username=? COLLATE NOCASE').get(username))throw new HttpError(409,'Ese nombre de usuario no está disponible.')
   return transaction(db,()=>{
    const id=randomUUID()
    db.prepare("INSERT INTO users(id,username,role,status,createdAt,updatedAt) VALUES(?,?,'usuario','invitado',?,?)").run(id,username,stamp(),stamp())
    db.prepare('INSERT INTO user_analytics VALUES(?,?)').run(id,stamp())
    audit(actorId,'usuario.invitado',id)
    return issue(id,'invitacion')
   })
  },
  manage(id,body,actorId){
   input(body,['action'])
   if(id==='1')throw new HttpError(403,'Esta acción no está permitida sobre el administrador principal.')
   const account=user(id)
   const action=enumeration(body.action,['activar','desactivar','revocar','recuperar'],'acción')
   return transaction(db,()=>{
    let result={ok:true}
    if(action==='activar'){
     if(['invitado','pendiente'].includes(account.status)||!db.prepare('SELECT passwordHash FROM users WHERE id=?').get(id).passwordHash)throw new HttpError(409,'La cuenta debe completar su invitación.')
     db.prepare("UPDATE users SET status='activo',updatedAt=? WHERE id=?").run(stamp(),id)
    }
    if(action==='desactivar')db.prepare('UPDATE user_invitations SET usedAt=COALESCE(usedAt,?) WHERE userId=?').run(stamp(),id)
    if(action==='desactivar')db.prepare("UPDATE users SET status='inactivo',updatedAt=? WHERE id=?").run(stamp(),id)
    if(['desactivar','revocar','recuperar'].includes(action))db.prepare('DELETE FROM sessions WHERE userId=?').run(id)
    if(action==='recuperar'){db.prepare("UPDATE users SET status='invitado',passwordHash=NULL,updatedAt=? WHERE id=?").run(stamp(),id);result=issue(id,'recuperacion')}
    audit(actorId,'usuario.'+action,id)
    return result
   })
  },
  dashboard(){
   const since=new Date(now().getTime()-30*86400000).toISOString()
   const count=sql=>db.prepare(sql).get().n
   return {generatedAt:stamp(),activeSince:since,users:count("SELECT count(*) n FROM users WHERE username IS NOT NULL"),enabled:count("SELECT count(*) n FROM users WHERE status='activo'"),active:db.prepare("SELECT count(*) n FROM users WHERE lastLoginAt>=? AND status='activo'").get(since).n,tasks:count('SELECT count(*) n FROM tasks'),courses:count('SELECT count(*) n FROM courses'),teachers:count('SELECT count(*) n FROM teachers'),sessions:count('SELECT count(*) n FROM class_sessions'),projects:count("SELECT count(*) n FROM task_academic WHERE tipo='proyecto'"),announcements:db.prepare('SELECT count(*) n FROM announcements WHERE published=1 AND publishAt<=? AND (expiresAt IS NULL OR expiresAt>?)').get(stamp(),stamp()).n,supportPending:count("SELECT count(*) n FROM support_tickets WHERE status IN ('abierta','revision')")}
  },
  auditLog(){return db.prepare('SELECT a.*,u.username AS actor FROM admin_audit_log a JOIN users u ON u.id=a.actorId ORDER BY a.createdAt DESC,a.id LIMIT 200').all()},
  settings(){return db.prepare('SELECT * FROM platform_settings WHERE id=1').get()},
  saveSettings(body,header,actorId){
   input(body,['name','notice'])
   return transaction(db,()=>{
    version(this.settings(),header)
    db.prepare('UPDATE platform_settings SET name=?,notice=?,updatedAt=?,version=version+1 WHERE id=1').run(text(body.name,'nombre',80),text(body.notice,'aviso',2000,false),stamp())
    audit(actorId,'plataforma.configuracion','1');return this.settings()
   })
  },
  announcements(){return db.prepare('SELECT * FROM announcements ORDER BY pinned DESC,createdAt DESC').all().map(a=>({...a,recipients:db.prepare('SELECT r.userId,r.readAt,u.username FROM announcement_recipients r JOIN users u ON u.id=r.userId WHERE announcementId=?').all(a.id)}))},
  saveAnnouncement(body,id,header,actorId){
   input(body,['title','body','importance','pinned','published','audience','recipients','publishAt','expiresAt'])
   const title=text(body.title,'título'),content=text(body.body,'contenido',10000),importance=enumeration(body.importance,['normal','importante','urgente'],'importancia'),audience=enumeration(body.audience,['todos','usuarios','seleccionados'],'destinatarios')
   if(typeof body.pinned!=='boolean'||typeof body.published!=='boolean')throw new HttpError(400,'Estados de anuncio no válidos.')
   const publishAt=instant(body.publishAt),expiresAt=instant(body.expiresAt,true)
   if(expiresAt&&expiresAt<=publishAt)throw new HttpError(400,'La caducidad debe ser posterior a la publicación.')
   if(!Array.isArray(body.recipients)||body.recipients.length>500||body.recipients.some(i=>typeof i!=='string'))throw new HttpError(400,'Destinatarios no válidos.')
   const recipients=audience==='seleccionados'?[...new Set(body.recipients)]:db.prepare("SELECT id FROM users WHERE username IS NOT NULL"+(audience==='usuarios'?" AND role='usuario'":'')).all().map(u=>u.id)
   if(audience==='seleccionados'&&!recipients.length)throw new HttpError(400,'Selecciona al menos un destinatario.')
   recipients.forEach(user)
   return transaction(db,()=>{
    if(id)version(db.prepare('SELECT * FROM announcements WHERE id=?').get(id),header)
    else id=randomUUID()
    if(db.prepare('SELECT 1 FROM announcements WHERE id=?').get(id))db.prepare('UPDATE announcements SET title=?,body=?,importance=?,pinned=?,published=?,audience=?,publishAt=?,expiresAt=?,updatedAt=?,version=version+1 WHERE id=?').run(title,content,importance,+body.pinned,+body.published,audience,publishAt,expiresAt,stamp(),id)
    else db.prepare('INSERT INTO announcements(id,title,body,importance,pinned,published,audience,publishAt,expiresAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,title,content,importance,+body.pinned,+body.published,audience,publishAt,expiresAt,stamp(),stamp())
    // Conservamos recibos históricos; la elegibilidad se comprueba en cada lectura.
    const add=db.prepare('INSERT INTO announcement_recipients(announcementId,userId) VALUES(?,?) ON CONFLICT DO NOTHING')
    const current=new Set(recipients)
    if(audience==='seleccionados')db.prepare('UPDATE announcements SET audience=? WHERE id=?').run('seleccionados',id)
    for(const recipient of current)add.run(id,recipient)
    // Destinatarios retirados pierden acceso sin borrar la marca histórica.
    db.prepare('UPDATE announcement_recipients SET selected=0 WHERE announcementId=?').run(id)
    for(const recipient of current)db.prepare('UPDATE announcement_recipients SET selected=1 WHERE announcementId=? AND userId=?').run(id,recipient)
    audit(actorId,body.published?'anuncio.publicado':'anuncio.guardado',id)
    return this.announcements().find(a=>a.id===id)
   })
  }
 }
}
