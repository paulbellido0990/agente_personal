import {test} from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {DatabaseSync} from 'node:sqlite'
import {readFileSync,mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,sep} from 'node:path'
import {prepareMigrationBackup} from '../src/db/migrationBackup.js'
import {openDatabase} from '../src/db/database.js'
import {createAcademicService} from '../src/services/academicService.js'
import {createTaskRepository} from '../src/repositories/taskRepository.js'
import {createTaskService} from '../src/services/taskService.js'
import {createReminderService} from '../src/services/reminderService.js'
import {createApp,authenticatedFetch} from './helpers/authenticated.js'
const now=()=>new Date('2026-10-15T14:00:00Z')
const termInput={nombre:'2026-II prueba',fechaInicio:'2026-08-01',fechaFin:'2026-12-31',estado:'activo'}
const taskInput={titulo:'Actividad de prueba',descripcion:'',categoria:'Personal conservada',prioridad:'alta',estado:'pendiente',fechaLimite:'2026-10-15',recordatorio:0}
function fixture(t){
 const db=openDatabase(':memory:');t.after(()=>db.close())
 const academic=createAcademicService(db,now),tasks=createTaskService(createTaskRepository(db))
 const term=academic.save('terms',termInput)
 const courseBody={termId:term.id,nombre:'Curso de prueba',codigo:'T-1',docentes:'Docente de prueba',creditos:4,color:'#8056D9',descripcion:'',estado:'activa'}
 const course=academic.save('courses',courseBody)
 const sessionBody={courseId:course.id,dia:4,horaInicio:'10:00',horaFin:'12:00',tipo:'laboratorio',aula:'L-1',docente:'',observaciones:'',fechaInicio:term.fechaInicio,fechaFin:term.fechaFin,recordatorio:0}
 return {db,academic,tasks,term,course,courseBody,sessionBody}
}
test('semestres: editar, activar uno y archivar conservando asignaturas',t=>{
 const f=fixture(t),second=f.academic.save('terms',{...termInput,nombre:'2027-I',fechaInicio:'2027-03-01',fechaFin:'2027-07-31'})
 assert.equal(f.academic.snapshot().terms.filter(t=>t.estado==='activo').length,1)
 assert.equal(f.academic.snapshot().terms.find(t=>t.id===f.term.id).version,2)
 f.academic.save('terms',{...termInput,estado:'archivado'},f.term.id)
 assert.equal(f.academic.snapshot().courses[0].termId,f.term.id)
 assert.equal(f.academic.snapshot().terms.find(t=>t.id===second.id).estado,'activo')
 assert.throws(()=>f.academic.save('terms',{...termInput,fechaInicio:'2026-02-30'}),/fechas/)
})
test('asignaturas: relaciones, validación y edición preservan identificador',t=>{
 const f=fixture(t),changed=f.academic.save('courses',{...f.courseBody,nombre:'Nombre editado'},f.course.id)
 assert.equal(changed.id,f.course.id);assert.equal(changed.version,2)
 for(const body of [{...f.courseBody,termId:'inexistente'},{...f.courseBody,creditos:-1},{...f.courseBody,color:'red'},{...f.courseBody,termId:{}}])assert.throws(()=>f.academic.save('courses',body))
 assert.equal(f.academic.snapshot().courses.length,1)
})
test('horario: reglas semanales, conflictos, vigencia, edición y eliminación',t=>{
 const f=fixture(t),a=f.academic.save('sessions',f.sessionBody)
 const b=f.academic.save('sessions',{...f.sessionBody,horaInicio:'11:00',horaFin:'13:00'})
 assert.deepEqual(b.conflicts,[a.id]);assert.equal(f.db.prepare('SELECT count(*) n FROM tasks').get().n,0)
 const c=f.academic.save('sessions',{...f.sessionBody,horaInicio:'12:00',horaFin:'14:00'})
 assert.ok(!c.conflicts.includes(a.id))
 assert.throws(()=>f.academic.save('sessions',{...f.sessionBody,fechaInicio:'2026-07-31'}),/semestre/)
 assert.throws(()=>f.academic.save('sessions',{...f.sessionBody,horaInicio:'23:00',horaFin:'01:00'}),/horas/)
 f.academic.save('sessions',{...f.sessionBody,dia:5},a.id)
 assert.equal(f.academic.snapshot().sessions.find(s=>s.id===a.id).dia,5)
 f.academic.removeSession(b.id)
 assert.equal(f.academic.snapshot().sessions.length,2)
})
test('evaluaciones y laboratorios usan CRUD, recordatorios y una sola tarea',t=>{
 const f=fixture(t)
 const exam=f.tasks.create({...taskInput,academic:{courseId:f.course.id,tipo:'examen',detalles:{evaluacion:'parcial',hora:'09:30',aula:'A-1',temas:'Unidades 1 y 2'}}}).task
 assert.equal(exam.academic.tipo,'examen')
 assert.equal(f.tasks.create({...taskInput,id:exam.id,academic:{detalles:{temas:'Unidades 1 y 2',aula:'A-1',hora:'09:30',evaluacion:'parcial'},tipo:'examen',courseId:f.course.id}}).created,false)
 const edited=f.tasks.update(exam.id,{...taskInput,titulo:'Examen editado',academic:exam.academic})
 assert.equal(edited.id,exam.id);assert.equal(edited.academic.detalles.hora,'09:30')
 const lab=f.tasks.create({...taskInput,titulo:'Informe de laboratorio',academic:{courseId:f.course.id,tipo:'laboratorio',detalles:{numero:'3',fechaRealizacion:'2026-10-14',recursos:'https://example.org/recurso'}}}).task
 f.tasks.status(lab.id,{estado:'completada'})
 assert.equal(f.tasks.get(lab.id).academic.detalles.numero,'3')
 const stats=f.academic.snapshot().statistics[0]
 assert.equal(stats.laboratoriosCompletados,1);assert.equal(stats.examenesProximos,1);assert.equal(stats.percent,50)
 assert.equal(createReminderService(f.db,now).list().filter(e=>e.taskId===exam.id).length,1)
 assert.throws(()=>f.tasks.create({...taskInput,academic:{courseId:f.course.id,tipo:'laboratorio',detalles:{recursos:'javascript:alert(1)'}}}))
 assert.equal(f.tasks.list({}).length,2)
})
test('proyectos e hitos: avance real, referencias estables y protección de relaciones',t=>{
 const f=fixture(t)
 const project=f.tasks.create({...taskInput,titulo:'Proyecto final',academic:{courseId:f.course.id,tipo:'proyecto',detalles:{fechaInicio:'2026-09-01',integrantes:'Equipo',entregables:'Informe y código'}}}).task
 const milestone=f.tasks.create({...taskInput,titulo:'Primer hito',academic:{courseId:f.course.id,tipo:'hito',projectId:project.id,detalles:{}}}).task
 assert.equal(f.academic.snapshot().projects[0].percent,0)
 f.tasks.status(milestone.id,{estado:'completada'})
 assert.equal(f.academic.snapshot().projects[0].percent,100)
 assert.throws(()=>f.tasks.remove(project.id),/hitos/)
 assert.throws(()=>f.tasks.update(project.id,{...taskInput,academic:null}),/hitos/)
 assert.throws(()=>f.tasks.create({...taskInput,academic:{courseId:f.course.id,tipo:'hito',projectId:'inexistente'}}))
 f.tasks.remove(milestone.id);f.tasks.remove(project.id)
 assert.equal(f.tasks.list({}).length,0)
})
test('avisos de clase: mismo ledger, repetición semanal sin duplicación y lectura persistente',t=>{
 const f=fixture(t),session=f.academic.save('sessions',f.sessionBody),service=createReminderService(f.db,now)
 const first=service.list();assert.equal(first.length,1);assert.equal(first[0].sessionId,session.id);assert.equal(first[0].taskId,null)
 service.read(first[0].id)
 assert.equal(service.list()[0].id,first[0].id);assert.ok(service.list()[0].readAt)
 assert.equal(service.claim(first[0].id).claimed,false)
 f.academic.save('sessions',{...f.sessionBody,dia:5},session.id)
 assert.equal(service.list().length,0)
 assert.equal(f.db.prepare('SELECT count(*) n FROM tasks').get().n,0)
})
test('API académica exige sesión, CSRF y versión; dos sesiones no sobrescriben',async t=>{
 const f=fixture(t),server=createApp({db:f.db,now}).listen(0,'127.0.0.1')
 await once(server,'listening');t.after(()=>{server.closeAllConnections();return new Promise(r=>server.close(r))})
 const url='http://127.0.0.1:'+server.address().port
 assert.equal((await fetch(url+'/api/academic')).status,401)
 assert.equal((await fetch(url+'/api/academic/terms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(termInput)})).status,401)
 const list=await authenticatedFetch(url+'/api/academic');assert.equal(list.status,200)
 const options={method:'PUT',headers:{'Content-Type':'application/json','If-Match':'"1"'},body:JSON.stringify({...termInput,nombre:'Editado'})}
 assert.equal((await authenticatedFetch(url+'/api/academic/terms/'+f.term.id,options)).status,200)
 assert.equal((await authenticatedFetch(url+'/api/academic/terms/'+f.term.id,options)).status,409)
 assert.equal((await authenticatedFetch(url+'/api/academic/terms/'+f.term.id,{...options,headers:{'Content-Type':'application/json'}})).status,428)
 const login=await fetch(url+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Alira-Request':'1'},body:JSON.stringify({username:'fixture-owner',password:'fixture-private-password'})})
 const cookie=login.headers.get('set-cookie').split(';')[0]
 assert.equal((await fetch(url+'/api/academic/terms',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(termInput)})).status,403)
})
test('migración v5 a v6 con respaldo WAL conserva tareas, propietario, sesiones, metas y avisos',async t=>{
 const root=mkdtempSync(join(tmpdir(),'alira-academic-migration-')),path=join(root,'old.db')
 t.after(()=>{assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep)&&root.includes('alira-academic-migration-'));rmSync(root,{recursive:true,force:true})})
 const old=new DatabaseSync(path)
 old.exec('PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON')
 old.exec(readFileSync(new URL('../src/db/schema.sql',import.meta.url),'utf8'))
 for(const name of ['002-reminders','003-statistics-goals','004-assistant','005-security'])old.exec(readFileSync(new URL('../src/db/migrations/'+name+'.sql',import.meta.url),'utf8'))
 const stamp=now().toISOString()
 old.prepare("INSERT INTO tasks(id,titulo,descripcion,categoria,prioridad,estado,fechaLimite,createdAt,updatedAt,recordatorio) VALUES('old','Conservar tarea','','Personal','alta','pendiente','2026-10-15',?,?,0)").run(stamp,stamp)
 old.prepare("INSERT INTO reminder_events VALUES('notice','old','2026-10-15',0,'2026-10-15',?,NULL,NULL)").run(stamp)
 old.prepare("INSERT INTO owner VALUES(1,'privado','hash de prueba',?,?)").run(stamp,stamp)
 old.prepare("INSERT INTO sessions VALUES('token-hash',1,?,?)").run(stamp,'2026-10-22T14:00:00.000Z')
 const before={}
 for(const table of ['tasks','reminder_events','owner','sessions','goals','task_events','analytics_metadata','conversations'])before[table]=old.prepare('SELECT * FROM '+table).all()
 const copyPath=await prepareMigrationBackup(path,join(root,'backups'));assert.ok(copyPath)
 const check=new DatabaseSync(copyPath,{readOnly:true});assert.equal(check.prepare('PRAGMA integrity_check').get().integrity_check,'ok');check.close();old.close()
 const db=openDatabase(path)
 try{
  assert.equal(db.prepare('PRAGMA user_version').get().user_version,7)
  for(const [table,rows]of Object.entries(before))assert.deepEqual(db.prepare('SELECT * FROM '+table).all().map(record=>Object.fromEntries(Object.keys(rows[0]||{}).map(k=>[k,record[k]]))),rows.map(r=>({...r})),table)
  assert.equal(db.prepare('SELECT count(*) n FROM reminder_events_legacy_v5').get().n,1)
  assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0)
  assert.equal(db.prepare('SELECT count(*) n FROM courses').get().n,0)
 }finally{db.close()}
 const again=openDatabase(path);again.close()
 assert.equal(await prepareMigrationBackup(path,join(root,'backups')),null)
})
