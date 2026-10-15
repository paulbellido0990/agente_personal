import {test} from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {mkdtempSync,rmSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,sep} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import {openDatabase} from '../src/db/database.js'
import {createApp} from '../src/app.js'
import {hashPassword,initializeOwner,verifyPassword} from '../src/services/passwords.js'
import {createBackup} from '../src/services/backupService.js'
import {createTaskService} from '../src/services/taskService.js'
import {createTaskRepository} from '../src/repositories/taskRepository.js'
const password='security-fixture-password',username='security-owner'
const hash=await hashPassword(password)
const input={titulo:'Tarea protegida',descripcion:'Privada',categoria:'Estudio',prioridad:'alta',estado:'pendiente',fechaLimite:null}
async function fixture(t,{file=false,...options}={}){
 const root=file?mkdtempSync(join(tmpdir(),'alira-security-')):null
 const path=root?join(root,'data.db'):':memory:',db=openDatabase(path),servers=[]
 let clock=new Date()
 const date=clock.toISOString()
 db.prepare('INSERT INTO owner VALUES (1,?,?,?,?)').run(username,hash,date,date)
 async function listen(extra={}){
  const server=createApp({db,now:()=>clock,...options,...extra}).listen(0,'127.0.0.1');servers.push(server);await once(server,'listening')
  return 'http://127.0.0.1:'+server.address().port
 }
 const url=await listen()
 t.after(async()=>{
  for(const server of servers){server.closeAllConnections();await new Promise(r=>server.close(r))}
  db.close()
  if(root){assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep)&&root.includes('alira-security-'));rmSync(root,{recursive:true,force:true})}
 })
 const request=async(path,method='GET',body,auth={},headers={})=>{
  const r=await fetch((auth.url||url)+path,{method,headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...(auth.cookie?{Cookie:auth.cookie,'X-CSRF-Token':auth.csrf}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})})
  return {status:r.status,headers:r.headers,json:r.status===204?null:(r.headers.get('content-type')?.includes('json')?await r.json():null)}
 }
 const login=async(extra={},body={username,password})=>{
  const r=await request('/api/auth/login','POST',body,extra,{'X-Alira-Request':'1',...(extra.headers||{})})
  return {...r,cookie:r.headers.get('set-cookie')?.split(';')[0],csrf:r.json?.data?.csrfToken}
 }
 return {db,root,path,url,listen,request,login,advance:ms=>{clock=new Date(clock.getTime()+ms)}}
}
test('hash moderno, propietario único y ninguna cuenta predeterminada',async()=>{
 assert.ok(await verifyPassword(password,hash));assert.equal(await verifyPassword('incorrecta',hash),false)
 assert.ok(!hash.includes(password))
 const db=openDatabase(':memory:')
 try{
  assert.equal(db.prepare('SELECT count(*) n FROM owner').get().n,0)
  await assert.rejects(initializeOwner(db,'propietario','corta'))
  await initializeOwner(db,'propietario',password)
  await assert.rejects(initializeOwner(db,'segundo',password))
 }finally{db.close()}
})
test('todos los datos privados requieren sesión; público mínimo y sin registro remoto',async t=>{
 const f=await fixture(t)
 for(const path of ['/api/tasks','/api/reminders','/api/statistics','/api/goals','/api/statistics/export.pdf','/api/settings'])assert.equal((await f.request(path)).status,401,path)
 assert.equal((await f.request('/api/tasks','POST',input)).status,401)
 assert.equal((await f.request('/api/health')).status,200)
 assert.equal((await f.request('/api/auth/session')).json.data.authenticated,false)
 assert.equal((await f.request('/api/auth/register','POST',{})).status,401)
})
test('login, cookies HttpOnly/SameSite, CSRF y cierre con revocación real',async t=>{
 const f=await fixture(t)
 assert.equal((await f.login({}, {username,password:'incorrecta'})).status,401)
 const auth=await f.login()
 assert.equal(auth.status,200);assert.match(auth.headers.get('set-cookie'),/HttpOnly/);assert.match(auth.headers.get('set-cookie'),/SameSite=Strict/)
 assert.equal((await f.request('/api/tasks','GET',undefined,auth)).status,200)
 assert.equal((await f.request('/api/tasks','POST',input,auth,{'X-CSRF-Token':''})).status,403)
 assert.equal((await f.request('/api/tasks','POST',input,auth,{Origin:'https://malicioso.example'})).status,403)
 assert.equal((await f.request('/api/tasks','POST',input,auth)).status,201)
 assert.equal((await f.request('/api/auth/logout','POST',{},auth)).status,204)
 assert.equal((await f.request('/api/tasks','GET',undefined,auth)).status,401)
})
test('caducidad y límites de intentos persistentes',async t=>{
 const f=await fixture(t,{sessionHours:1})
 const auth=await f.login()
 f.advance(3600001)
 assert.equal((await f.request('/api/tasks','GET',undefined,auth)).status,401)
 for(let i=0;i<5;i++)assert.equal((await f.login({}, {username,password:'incorrecta'})).status,401)
 assert.equal((await f.login()).status,429)
 const second=await f.listen()
 assert.equal((await f.login({url:second})).status,429)
 f.advance(15*60000+1);assert.equal((await f.login()).status,200)
})
test('sesión persiste al crear otro servidor sobre la misma base, sin guardar token en claro',async t=>{
 const f=await fixture(t,{file:true}),auth=await f.login()
 const secondDb=openDatabase(f.path)
 try{
  const session=secondDb.prepare('SELECT * FROM sessions').get()
  assert.notEqual(session.tokenHash,auth.cookie.split('=')[1])
 }finally{secondDb.close()}
 const second=await f.listen()
 assert.equal((await f.request('/api/tasks','GET',undefined,{...auth,url:second})).status,200)
 assert.ok((await f.request('/api/auth/session','GET',undefined,{...auth,url:second})).json.data.csrfToken)
})
test('dos dispositivos detectan conflictos en tarea, estado, borrado y metas',async t=>{
 const f=await fixture(t),a=await f.login(),b=await f.login()
 const task=(await f.request('/api/tasks','POST',input,a)).json.data
 assert.equal((await f.request('/api/tasks/'+task.id,'PUT',input,a)).status,428)
 const headers={'If-Match':'"'+task.version+'"'}
 const changed=await f.request('/api/tasks/'+task.id,'PUT',{...input,titulo:'Cambio del primer dispositivo'},a,headers)
 assert.equal(changed.status,200);assert.equal(changed.json.data.version,2)
 for(const [method,path,body]of [['PUT','',input],['PATCH','/status',{estado:'completada'}],['DELETE','',undefined]])assert.equal((await f.request('/api/tasks/'+task.id+path,method,body,b,headers)).status,409)
 const fresh=(await f.request('/api/tasks','GET',undefined,b)).json.data[0]
 assert.equal(fresh.titulo,'Cambio del primer dispositivo')
 const today=new Date().toISOString().slice(0,10)
 const goal=(await f.request('/api/goals','POST',{nombre:'Meta compartida',fechaInicio:today,fechaFin:today,objetivo:3},a)).json.data
 assert.equal((await f.request('/api/goals/'+goal.id+'/active','PATCH',{activa:false},a,{'If-Match':'"1"'})).status,200)
 assert.equal((await f.request('/api/goals/'+goal.id+'/active','PATCH',{activa:true},b,{'If-Match':'"1"'})).status,409)
})
test('cambio de contraseña invalida todos los dispositivos',async t=>{
 const f=await fixture(t),a=await f.login(),b=await f.login()
 assert.equal((await f.request('/api/auth/password','POST',{currentPassword:password,newPassword:'nueva-password-segura'},a)).status,200)
 for(const auth of [a,b])assert.equal((await f.request('/api/tasks','GET',undefined,auth)).status,401)
 assert.equal((await f.login({}, {username,password})).status,401)
 assert.equal((await f.login({}, {username,password:'nueva-password-segura'})).status,200)
})
test('HTTPS, cookies Secure y proxy confiable; el encabezado reenviado no se confía por defecto',async t=>{
 const f=await fixture(t,{production:true,origin:'https://alira.example',trustProxy:'loopback'})
 const auth=await f.login({headers:{'X-Forwarded-Proto':'https'}})
 assert.equal(auth.status,200);assert.match(auth.headers.get('set-cookie'),/__Host-alira.sid/);assert.match(auth.headers.get('set-cookie'),/; Secure/)
 assert.match(auth.headers.get('content-security-policy'),/frame-ancestors 'none'/)
 const untrusted=await f.listen({trustProxy:false})
 assert.equal((await f.login({url:untrusted,headers:{'X-Forwarded-Proto':'https'}})).status,426)
})
test('respaldo WAL activo y restauración temporal íntegra sin sesiones reutilizables',async t=>{
 const f=await fixture(t,{file:true})
 await f.login()
 const tasks=createTaskService(createTaskRepository(f.db)),task=tasks.create(input).task
 const backup=await createBackup(f.db,join(f.root,'backups'))
 assert.ok(readFileSync(backup.path).length>0)
 const restored=openDatabase(backup.path)
 try{
  assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok')
  assert.equal(restored.prepare('SELECT titulo FROM tasks WHERE id=?').get(task.id).titulo,input.titulo)
  assert.equal(restored.prepare('SELECT count(*) n FROM owner').get().n,1)
  assert.equal(restored.prepare('SELECT count(*) n FROM sessions').get().n,0)
  assert.equal(restored.prepare('PRAGMA user_version').get().user_version,7)
 }finally{restored.close()}
 assert.equal(f.db.prepare('SELECT count(*) n FROM sessions').get().n,1)
})

test('sesión sobrevive un reinicio real del proceso del backend',async t=>{
 const {spawn}=await import('node:child_process')
 const f=await fixture(t,{file:true}),auth=await f.login(),children=[]
 t.after(()=>{for(const child of children)if(child.exitCode===null)child.kill()})
 async function start(){
  const child=spawn(process.execPath,['--input-type=module','-e',"import {openDatabase} from './src/db/database.js';import {createApp} from './src/app.js';const db=openDatabase(process.env.ALIRA_TEST_DB);const s=createApp({db}).listen(0,'127.0.0.1',()=>console.log(s.address().port));"],{cwd:new URL('../',import.meta.url),env:{...process.env,ALIRA_TEST_DB:f.path},stdio:['ignore','pipe','pipe']})
  children.push(child)
  const port=await new Promise((resolve,reject)=>{let text='';child.stdout.on('data',p=>{text+=p;if(text.includes('\n'))resolve(Number(text.trim()))});child.once('error',reject);child.once('exit',()=>reject(new Error('No inició el proceso de prueba.')))})
  return {child,url:'http://127.0.0.1:'+port}
 }
 const first=await start()
 assert.equal((await f.request('/api/tasks','GET',undefined,{...auth,url:first.url})).status,200)
 const exit=once(first.child,'exit');first.child.kill();await exit
 const second=await start()
 assert.equal((await f.request('/api/tasks','GET',undefined,{...auth,url:second.url})).status,200)
 const secondExit=once(second.child,'exit');second.child.kill();await secondExit
})
test('comando de restauración crea archivo nuevo y rechaza sobrescribir principal',async t=>{
 const {spawnSync}=await import('node:child_process')
 const f=await fixture(t,{file:true})
 const saved=createTaskService(createTaskRepository(f.db)).create(input).task
 const copy=await createBackup(f.db,join(f.root,'backups')),target=join(f.root,'restored.db')
 const run=destination=>spawnSync(process.execPath,['scripts/restore.js','--source',copy.path,'--target',destination],{cwd:new URL('../',import.meta.url),env:{...process.env,NODE_ENV:'development',DB_PATH:f.path,BACKUP_DIR:join(f.root,'..','alira-restore-unused')},encoding:'utf8'})
 const result=run(target);assert.equal(result.status,0,result.stderr)
 const restored=openDatabase(target)
 try{assert.equal(restored.prepare('SELECT titulo FROM tasks WHERE id=?').get(saved.id).titulo,input.titulo)}finally{restored.close()}
 assert.notEqual(run(f.path).status,0)
 assert.equal(f.db.prepare('SELECT titulo FROM tasks WHERE id=?').get(saved.id).titulo,input.titulo)
})

test('producción sirve interfaz y API bajo el mismo origen con CSP y sin exponer la base',async t=>{
 const {mkdir,writeFile}=await import('node:fs/promises')
 const f=await fixture(t,{file:true,production:true,origin:'https://alira.example',trustProxy:'loopback'})
 const staticDir=join(f.root,'public');await mkdir(staticDir);await writeFile(join(staticDir,'index.html'),'<html><link rel="manifest" href="manifest.webmanifest"></html>')
 const url=await f.listen({staticDir})
 const r=await fetch(url+'/',{headers:{'X-Forwarded-Proto':'https'}})
 assert.equal(r.status,200);assert.match(r.headers.get('content-security-policy'),/script-src 'self'/);assert.match(await r.text(),/manifest.webmanifest/)
 assert.equal((await fetch(f.url+'/api/health')).status,200)
 assert.equal((await fetch(f.url+'/data/alira.db',{headers:{'X-Forwarded-Proto':'https'}})).status,404)
 assert.equal((await fetch(f.url+'/api/tasks',{headers:{'X-Forwarded-Proto':'https'}})).status,401)
})

test('un fallo al confirmar la transacción nunca anuncia un guardado exitoso',async t=>{
 const f=await fixture(t),auth=await f.login()
 const task=(await f.request('/api/tasks','POST',input,auth)).json.data
 f.db.exec("CREATE TABLE commit_guard (ownerId INTEGER REFERENCES owner(id) DEFERRABLE INITIALLY DEFERRED);CREATE TRIGGER force_commit_error AFTER UPDATE ON tasks BEGIN INSERT INTO commit_guard VALUES (99); END;")
 const response=await f.request('/api/tasks/'+task.id,'PUT',{...input,titulo:'No debe guardarse'},auth,{'If-Match':'"'+task.version+'"'})
 assert.equal(response.status,500)
 assert.equal(f.db.prepare('SELECT titulo FROM tasks WHERE id=?').get(task.id).titulo,input.titulo)
})
