import {test} from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {DatabaseSync,backup} from 'node:sqlite'
import {createHash} from 'node:crypto'
import {readFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,sep} from 'node:path'
import {createApp} from './helpers/authenticated.js'
import {openDatabase} from '../src/db/database.js'
import {initializeOwner} from '../src/services/passwords.js'
import {localDay} from '../../shared/tasks.js'
const password='multiuser-fixture-password'
const taskBody={titulo:'Tarea privada de Alicia',descripcion:'Contenido privado que no debe ver otra cuenta',categoria:'Personal',prioridad:'alta',estado:'pendiente',fechaLimite:localDay(),recordatorio:0}
async function fixture(t){
 const db=openDatabase(':memory:'),server=createApp({db}).listen(0,'127.0.0.1')
 await once(server,'listening')
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));db.close()})
 const url='http://127.0.0.1:'+server.address().port
 async function request(path,method='GET',body,auth={},headers={}){
  const r=await fetch(url+path,{method,headers:{'X-Alira-Request':'1',...(body!==undefined?{'Content-Type':'application/json'}:{}),...(auth.cookie?{Cookie:auth.cookie,'X-CSRF-Token':auth.csrf}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})})
  const content=r.status===204?null:r.headers.get('content-type')?.includes('json')?await r.json():await r.text()
  return {status:r.status,data:content?.data,error:content?.error,content,headers:r.headers}
 }
 async function login(username,pass=password){
  const r=await request('/api/auth/login','POST',{username,password:pass})
  return {...r,cookie:r.headers.get('set-cookie')?.split(';')[0],csrf:r.data?.csrfToken}
 }
 const admin=await login('fixture-owner','fixture-private-password');assert.equal(admin.status,200)
 async function invite(name){
  const invitation=await request('/api/control/invitations','POST',{username:name},admin)
  assert.equal(invitation.status,201,JSON.stringify(invitation.error))
  const accepted=await request('/api/auth/invitation','POST',{token:invitation.data.token,password})
  assert.equal(accepted.status,200,JSON.stringify(accepted.error))
  const account=await login(name);assert.equal(account.status,200)
  return {...account,id:invitation.data.userId,invitation:invitation.data}
 }
 return {db,url,request,login,admin,invite}
}
const match=record=>({'If-Match':'"'+record.version+'"'})
async function academic(f,auth){
 const term=(await f.request('/api/academic/terms','POST',{nombre:'2026 pruebas privadas',fechaInicio:'2026-01-01',fechaFin:'2026-12-31',estado:'activo'},auth)).data
 const course=(await f.request('/api/academic/courses','POST',{termId:term.id,nombre:'Asignatura privada',codigo:'',docentes:'',creditos:null,color:'#8056D9',descripcion:'Secreto del curso',estado:'activa'},auth)).data
 return {term,course}
}
test('invitaciones privadas, roles y activación de un solo uso sin registro público',async t=>{
 const f=await fixture(t),a=await f.invite('alicia')
 assert.equal(a.data.account.role,'usuario');assert.equal(f.admin.data.account.role,'administrador')
 assert.equal((await f.request('/api/control/users','GET',undefined,a)).status,403)
 assert.equal((await f.request('/api/control/invitations','POST',{username:'intruso',role:'administrador'},a)).status,403)
 assert.equal((await f.request('/api/auth/invitation','POST',{token:a.invitation.token,password})).status,400)
 assert.equal((await f.request('/api/auth/register','POST',{username:'publico',password})).status,401)
 assert.equal((await f.request('/api/control/users/1/actions','POST',{action:'desactivar'},f.admin)).status,403)
 assert.equal((await f.request('/api/control/invitations','POST',{username:'nuevo'},f.admin,{'X-CSRF-Token':''})).status,403)
 assert.equal(f.db.prepare('SELECT tokenHash FROM user_invitations WHERE userId=?').get(a.id).tokenHash.includes(a.invitation.token),false)
 assert.equal((await f.request('/api/settings/backup','POST',{currentPassword:password},a)).status,403)
})
test('aislamiento de tareas, importaciones, metas, estadísticas, reportes y avisos entre cuentas',async t=>{
 const f=await fixture(t),a=await f.invite('alicia'),b=await f.invite('bruno')
 const task=(await f.request('/api/tasks','POST',taskBody,a)).data
 assert.equal((await f.request('/api/tasks','GET',undefined,b)).data.length,0)
 assert.equal((await f.request('/api/tasks','GET',undefined,f.admin)).data.length,0)
 for(const [method,path,body]of [['GET','',undefined],['PUT','',taskBody],['PATCH','/status',{estado:'completada'}],['DELETE','',undefined]]){
  assert.equal((await f.request('/api/tasks/'+task.id+path,method,body,b,match(task))).status,404)
 }
 assert.equal((await f.request('/api/tasks','POST',{...taskBody,userId:a.id},b)).status,400)
 const legacy={...taskBody,id:task.id,createdAt:task.createdAt,updatedAt:task.updatedAt}
 assert.equal((await f.request('/api/tasks/import','POST',{tasks:[legacy]},b)).status,409)
 const today=localDay(),goal=(await f.request('/api/goals','POST',{nombre:'Meta privada',fechaInicio:today,fechaFin:today,objetivo:2},a)).data
 assert.equal((await f.request('/api/goals','GET',undefined,b)).data.length,0)
 assert.equal((await f.request('/api/goals/'+goal.id+'/active','PATCH',{activa:false},b,match(goal))).status,404)
 const report=(await f.request('/api/statistics','GET',undefined,b)).data
 assert.equal(report.summary.total,0)
 const csv=await f.request('/api/statistics/export.csv?revision='+report.revision,'GET',undefined,b)
 assert.equal(csv.status,200);assert.ok(!csv.content.includes(taskBody.titulo))
 const event=(await f.request('/api/reminders','GET',undefined,a)).data[0]
 assert.equal((await f.request('/api/reminders','GET',undefined,b)).data.length,0)
 assert.equal((await f.request('/api/reminders/'+event.id+'/read','PATCH',{},b)).status,404)
 assert.equal((await f.request('/api/tasks/'+task.id,'GET',undefined,a)).data.titulo,taskBody.titulo)
})
test('asignaturas y docentes propios, relaciones privadas y nombres actualizados en horario',async t=>{
 const f=await fixture(t),a=await f.invite('alicia'),b=await f.invite('bruno'),{term,course}=await academic(f,a)
 await academic(f,b) // Cada cuenta puede activar su propio semestre.
 const teacher=(await f.request('/api/academic/teachers','POST',{nombre:'Rosa Docente',email:'',notas:''},a)).data
 const snapshot=(await f.request('/api/academic','GET',undefined,b)).data
 assert.equal(snapshot.teachers.length,0);assert.ok(snapshot.courses.every(c=>c.userId===b.id))
 assert.equal((await f.request('/api/academic/teachers/'+teacher.id,'PUT',{nombre:'No permitido',email:'',notas:''},b,match(teacher))).status,404)
 assert.equal((await f.request('/api/academic/courses/'+course.id,'PUT',{termId:term.id,nombre:'Ajeno',codigo:'',docentes:'',creditos:null,color:'#8056D9',descripcion:'',estado:'activa'},b,match(course))).status,404)
 const body={courseId:course.id,dia:1,horaInicio:'08:00',horaFin:'10:00',tipo:'teoria',aula:'A-1',teacherId:teacher.id,fechaInicio:term.fechaInicio,fechaFin:term.fechaFin,recordatorio:null}
 assert.equal((await f.request('/api/academic/sessions','POST',body,b)).status,404)
 const session=(await f.request('/api/academic/sessions','POST',body,a)).data
 assert.ok(session.id)
 await f.request('/api/academic/teachers/'+teacher.id,'PUT',{nombre:'Rosa Actualizada',email:'',notas:''},a,match(teacher))
 assert.equal((await f.request('/api/academic','GET',undefined,a)).data.sessions[0].docente,'Rosa Actualizada')
 assert.equal((await f.request('/api/academic/teachers','POST',{nombre:'rosa actualizada'},a)).status,409)
 assert.equal((await f.request('/api/academic/teachers/'+teacher.id,'DELETE',undefined,a,{'If-Match':'"2"'})).status,409)
 assert.equal((await f.request('/api/tasks','POST',{...taskBody,academic:{courseId:course.id,tipo:'examen',detalles:{}}},b)).status,404)
 assert.throws(()=>f.db.prepare('UPDATE courses SET userId=? WHERE id=?').run(b.id,course.id))
 assert.throws(()=>f.db.prepare('INSERT INTO class_sessions(id,courseId,dia,horaInicio,horaFin,tipo,fechaInicio,fechaFin,createdAt,updatedAt,userId) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run('cross',course.id,1,'12:00','13:00','teoria',term.fechaInicio,term.fechaFin,new Date().toISOString(),new Date().toISOString(),b.id))
})
test('desactivar, recuperar y revocar sesiones preserva datos y no afecta a otras cuentas',async t=>{
 const f=await fixture(t),a=await f.invite('alicia'),b=await f.invite('bruno')
 const task=(await f.request('/api/tasks','POST',taskBody,a)).data
 await f.request('/api/control/users/'+a.id+'/actions','POST',{action:'desactivar'},f.admin)
 assert.equal((await f.request('/api/tasks','GET',undefined,a)).status,401)
 assert.equal((await f.login('alicia')).status,401)
 assert.equal((await f.request('/api/tasks','GET',undefined,b)).status,200)
 await f.request('/api/control/users/'+a.id+'/actions','POST',{action:'activar'},f.admin)
 const again=await f.login('alicia');assert.equal(again.status,200)
 const recovery=await f.request('/api/control/users/'+a.id+'/actions','POST',{action:'recuperar',currentPassword:'fixture-private-password'},f.admin)
 assert.equal(recovery.status,200)
 assert.equal((await f.request('/api/tasks','GET',undefined,again)).status,401)
 assert.equal((await f.request('/api/auth/invitation','POST',{token:recovery.data.token,password:'new-multiuser-password'})).status,200)
 assert.equal((await f.login('alicia')).status,401)
 const newAccess=await f.login('alicia','new-multiuser-password')
 assert.equal((await f.request('/api/tasks/'+task.id,'GET',undefined,newAccess)).status,200)
 await f.request('/api/control/users/'+a.id+'/actions','POST',{action:'revocar'},f.admin)
 assert.equal((await f.request('/api/tasks','GET',undefined,newAccess)).status,401)
 assert.equal((await f.request('/api/tasks','GET',undefined,f.admin)).status,200)
 assert.ok(f.db.prepare('SELECT lastLoginAt FROM users WHERE id=?').get(a.id).lastLoginAt)
})
test('anuncios: destinatarios, lectura, fechas, edición y despublicación',async t=>{
 const f=await fixture(t),a=await f.invite('alicia'),b=await f.invite('bruno')
 const body={title:'Aviso para Alicia',body:'Comunicado de prueba',importance:'importante',pinned:true,published:true,audience:'seleccionados',recipients:[a.id],publishAt:'2026-01-01T00:00:00.000Z',expiresAt:null}
 const announcement=(await f.request('/api/control/announcements','POST',body,f.admin)).data
 assert.ok(announcement.id)
 assert.equal((await f.request('/api/communications','GET',undefined,a)).data.announcements.length,1)
 assert.equal((await f.request('/api/communications','GET',undefined,b)).data.announcements.length,0)
 assert.equal((await f.request('/api/notifications/anuncio/'+announcement.id+'/read','PATCH',{},b)).status,404)
 assert.equal((await f.request('/api/notifications/anuncio/'+announcement.id+'/read','PATCH',{},a)).status,200)
 assert.ok((await f.request('/api/control/announcements','GET',undefined,f.admin)).data[0].recipients[0].readAt)
 assert.equal((await f.request('/api/control/announcements/'+announcement.id,'PUT',{...body,published:false},f.admin,match(announcement))).status,200)
 assert.equal((await f.request('/api/communications','GET',undefined,a)).data.announcements.length,0)
 assert.equal((await f.request('/api/control/announcements/'+announcement.id,'PUT',body,f.admin,match(announcement))).status,409)
 const future=await f.request('/api/control/announcements','POST',{...body,audience:'todos',recipients:[],publishAt:'2099-01-01T00:00:00.000Z'},f.admin)
 assert.equal(future.status,201)
 assert.equal((await f.request('/api/communications','GET',undefined,a)).data.announcements.length,0)
})
test('mensajería, soporte y notificaciones solo para participantes autorizados',async t=>{
 const f=await fixture(t),a=await f.invite('alicia'),b=await f.invite('bruno')
 const thread=(await f.request('/api/communications/threads','POST',{subject:'Mensaje administrativo',body:'Texto dirigido a Alicia',kind:'mensaje',userId:a.id},f.admin)).data
 assert.equal((await f.request('/api/communications/threads/'+thread.id,'GET',undefined,b)).status,404)
 assert.equal((await f.request('/api/communications/threads/'+thread.id+'/messages','POST',{body:'Intrusión'},b)).status,404)
 assert.ok((await f.request('/api/notifications','GET',undefined,a)).data.some(n=>n.id===thread.id&&!n.readAt))
 await f.request('/api/notifications/mensaje/'+thread.id+'/read','PATCH',{},a)
 assert.ok((await f.request('/api/communications/threads/'+thread.id,'GET',undefined,f.admin)).data.messages[0].read)
 await f.request('/api/communications/threads/'+thread.id+'/messages','POST',{body:'Respuesta autorizada'},a)
 assert.equal((await f.request('/api/communications/threads/'+thread.id,'GET',undefined,f.admin)).data.messages.length,2)
 const ticket=(await f.request('/api/communications/threads','POST',{subject:'Consulta de soporte',body:'Ayuda con horario',kind:'soporte',type:'consulta'},a)).data
 assert.equal(ticket.status,'abierta')
 assert.equal((await f.request('/api/communications/threads/'+ticket.id+'/status','PATCH',{status:'resuelta'},a,match(ticket))).status,403)
 assert.equal((await f.request('/api/communications/threads/'+ticket.id+'/status','PATCH',{status:'resuelta'},f.admin,match(ticket))).status,200)
 assert.equal((await f.request('/api/communications/threads/'+ticket.id,'GET',undefined,b)).status,404)
 assert.equal((await f.request('/api/communications/threads','POST',{subject:'Escalación',body:'No permitido',kind:'mensaje',userId:b.id},a)).status,403)
})
test('compartición explícita de lectura, revocación y administrador sin acceso automático',async t=>{
 const f=await fixture(t),a=await f.invite('alicia'),b=await f.invite('bruno'),{course}=await academic(f,a)
 assert.equal((await f.request('/api/shares','GET',undefined,b)).data.items.length,0)
 assert.equal((await f.request('/api/shares','POST',{recipient:'bruno',kind:'curso',resourceId:course.id},a)).status,201)
 const share=(await f.request('/api/shares','GET',undefined,b)).data.items[0]
 assert.equal(share.resource.nombre,course.nombre)
 assert.equal((await f.request('/api/shares/'+share.id,'GET',undefined,f.admin)).status,404)
 assert.equal((await f.request('/api/shares/'+share.id,'DELETE',undefined,b)).status,404)
 assert.equal((await f.request('/api/shares','POST',{recipient:'fixture-owner',kind:'curso',resourceId:course.id},b)).status,404)
 await f.request('/api/shares/'+share.id,'DELETE',undefined,a)
 assert.equal((await f.request('/api/shares/'+share.id,'GET',undefined,b)).status,404)
 assert.equal((await f.request('/api/shares','GET',undefined,b)).data.items[0].resource,null)
 assert.equal((await f.request('/api/academic','GET',undefined,b)).data.courses.length,0)
})
test('auditoría y métricas administrativas no revelan contenido privado',async t=>{
 const f=await fixture(t),a=await f.invite('alicia')
 await f.request('/api/tasks','POST',taskBody,a)
 const dashboard=(await f.request('/api/control/dashboard','GET',undefined,f.admin)).data
 assert.equal(dashboard.tasks,1);assert.equal(dashboard.users,2);assert.ok(dashboard.activeSince)
 assert.ok(!JSON.stringify(dashboard).includes(taskBody.titulo))
 const audit=(await f.request('/api/control/audit','GET',undefined,f.admin)).data
 assert.ok(audit.some(e=>e.action==='usuario.invitado'))
 assert.ok(!JSON.stringify(audit).includes(a.invitation.token))
 assert.equal((await f.request('/api/control/audit','GET',undefined,a)).status,403)
 assert.throws(()=>f.db.prepare('DELETE FROM admin_audit_log').run())
})
test('migración v6 asigna datos al propietario, preserva sesión y migra solo docentes inequívocos',async t=>{
 const root=mkdtempSync(join(tmpdir(),'alira-v9-migration-')),path=join(root,'legacy.db'),copyPath=join(root,'before.db')
 t.after(()=>{assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep)&&root.includes('alira-v9-migration-'));rmSync(root,{recursive:true,force:true})})
 const old=new DatabaseSync(path)
 old.exec('PRAGMA foreign_keys=ON;PRAGMA journal_mode=WAL')
 old.exec(readFileSync(new URL('../src/db/schema.sql',import.meta.url),'utf8'))
 for(const name of ['002-reminders','003-statistics-goals','004-assistant','005-security','006-academic'])old.exec(readFileSync(new URL('../src/db/migrations/'+name+'.sql',import.meta.url),'utf8'))
 await initializeOwner(old,'legacy-owner',password)
 const date=new Date().toISOString(),token='a'.repeat(64),hash=createHash('sha256').update(token).digest('hex')
 old.prepare('INSERT INTO sessions VALUES(?,1,?,?)').run(hash,date,new Date(Date.now()+3600000).toISOString())
 old.prepare("INSERT INTO academic_terms VALUES('term','2026','2026-01-01','2026-12-31','activo',1,?,?)").run(date,date)
 old.prepare("INSERT INTO courses(id,termId,nombre,color,estado,createdAt,updatedAt) VALUES('course','term','Curso','#8056D9','activa',?,?)").run(date,date)
 for(const [id,name]of [['one','Rosa Pérez'],['two','Ana / Luis']])old.prepare("INSERT INTO class_sessions(id,courseId,dia,horaInicio,horaFin,tipo,docente,fechaInicio,fechaFin,createdAt,updatedAt) VALUES(?,'course',1,'08:00','09:00','teoria',?,'2026-01-01','2026-12-31',?,?)").run(id,name,date,date)
 const beforeOwner={...old.prepare('SELECT * FROM owner').get()}
 await backup(old,copyPath);old.close()
 const db=openDatabase(path)
 try{
  const current=db.prepare("SELECT * FROM users WHERE id='1'").get()
  assert.equal(current.username,beforeOwner.username);assert.equal(current.passwordHash,beforeOwner.passwordHash);assert.equal(current.role,'administrador');assert.equal(current.lastLoginAt,date)
  assert.equal(db.prepare('SELECT * FROM sessions').get().tokenHash,hash)
  assert.equal(db.prepare('SELECT * FROM class_sessions WHERE id=?').get('one').userId,'1')
  assert.ok(db.prepare('SELECT teacherId FROM class_sessions WHERE id=?').get('one').teacherId)
  assert.equal(db.prepare('SELECT teacherId FROM class_sessions WHERE id=?').get('two').teacherId,null)
  assert.equal(db.prepare('SELECT count(*) n FROM teachers').get().n,1)
  assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys,1)
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0)
  const server=createApp({db}).listen(0,'127.0.0.1');await once(server,'listening')
  try{
   const session=await fetch('http://127.0.0.1:'+server.address().port+'/api/auth/session',{headers:{Cookie:'alira.sid='+token}}).then(r=>r.json())
   assert.equal(session.data.authenticated,true);assert.equal(session.data.account.id,'1')
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
 }finally{db.close()}
})
