import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,resolve,sep} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import {once} from 'node:events'
import {openDatabase} from '../src/db/database.js'
import {createTaskRepository} from '../src/repositories/taskRepository.js'
import {createTaskService} from '../src/services/taskService.js'
import {calculateStatistics} from '../src/services/statisticsCalculator.js'
import {createGoalService} from '../src/services/goalService.js'
import {createStatisticsService} from '../src/services/statisticsService.js'
import {createCsv,createPdf} from '../src/services/reportService.js'
import {createApp,authenticatedFetch as fetch} from './helpers/authenticated.js'
import {localDay} from '../../shared/tasks.js'
const now=new Date('2026-10-14T18:00:00Z')
const input={titulo:'Informe verificable',descripcion:'Datos',categoria:'Estudio',prioridad:'alta',estado:'pendiente',fechaLimite:'2026-10-15'}
const baseTask=(id,extra={})=>({id,...input,createdAt:'2026-10-10T18:00:00.000Z',updatedAt:'2026-10-14T18:00:00.000Z',completedAt:null,...extra})
const event=(id,taskId,kind,stamp,extra={})=>({id,taskId,kind,occurredAt:stamp,categoria:'Estudio',prioridad:'alta',fechaLimite:'2026-10-13',...extra})
function report(extra={}){
  return calculateStatistics({tasks:[],events:[],startedAt:'2026-09-01T18:00:00.000Z',from:'2026-10-08',to:'2026-10-14',now,...extra})
}
function temporary(t){
  const root=mkdtempSync(join(tmpdir(),'alira-statistics-test-'))
  t.after(()=>{assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep)&&root.includes('alira-statistics-test-'));rmSync(root,{recursive:true,force:true})})
  return join(root,'data.db')
}
test('porcentajes, estados, prioridades, categorías y métricas de cohorte actual',()=>{
  const data=report({tasks:[baseTask('a'),baseTask('b',{estado:'en_progreso',prioridad:'media',categoria:'Personal',fechaLimite:'2026-10-12'}),baseTask('c',{estado:'completada',prioridad:'baja'})]})
  assert.equal(data.summary.total,3);assert.equal(data.summary.percent,33.3)
  assert.deepEqual(data.states.map(s=>s.value),[1,1,1])
  assert.deepEqual(data.priorities.map(s=>s.value),[1,1,1])
  assert.equal(data.categories[0].name,'Estudio');assert.equal(data.categories[0].percent,66.7)
  assert.equal(data.summary.vencidas,1);assert.equal(data.summary.proximas,1)
  assert.equal(data.summary.unknownCompleted,1)
})
test('actividad semanal/mensual usa Lima, distingue plazo y deduplica por tarea en el rango',()=>{
  const data=report({events:[
    event('c','a','created','2026-10-09T18:00:00.000Z'),
    event('c2','a','created','2026-10-09T18:00:00.000Z'),
    event('f','a','completed','2026-10-14T02:00:00.000Z'),
    event('g','a','completed','2026-10-14T18:00:00.000Z'),
    event('h','b','completed','2026-10-14T18:00:00.000Z'),
    event('i','c','completed','2026-10-14T18:00:00.000Z',{fechaLimite:null}),
  ]})
  assert.equal(data.summary.completed,3);assert.equal(data.summary.onTime,1);assert.equal(data.summary.late,1);assert.equal(data.summary.noDeadline,1)
  assert.equal(data.weekly.find(d=>d.date==='2026-10-13').completed,1)
  assert.equal(data.summary.average,.43)
  assert.equal(data.monthly[0].created,1);assert.equal(data.monthly[0].completed,3)
  assert.equal(data.summary.bestDay,'2026-10-14')
})
test('rangos inclusivos, cambios de mes y ausencia de datos sin NaN ni historia inventada',()=>{
  const data=report({from:'2026-09-30',to:'2026-10-14',events:[event('a','a','completed','2026-10-01T02:00:00.000Z')]})
  assert.equal(data.monthly.length,2);assert.equal(data.monthly[0].completed,1)
  assert.equal(report().summary.percent,0)
  assert.equal(report({startedAt:now.toISOString()}).summary.average,null)
  assert.equal(report().summary.bestDay,null)
  const unknownCreation=report({tasks:[baseTask('legacy',{createdAt:'1970-01-01T00:00:00.000Z'})],from:'1970-01-01',to:'1970-01-01'})
  assert.equal(unknownCreation.summary.total,0);assert.equal(unknownCreation.summary.unknownCreated,1)
  assert.throws(()=>report({from:'2026-10-15'}))
  assert.throws(()=>report({from:'2024-01-01'}))
})
test('migración v2 a la versión actual conserva tareas y avisos; completedAt histórico permanece null',t=>{
  const path=temporary(t),old=new DatabaseSync(path)
  old.exec(readFileSync(new URL('../src/db/schema.sql',import.meta.url),'utf8'))
  old.exec(readFileSync(new URL('../src/db/migrations/002-reminders.sql',import.meta.url),'utf8'))
  old.prepare('INSERT INTO tasks VALUES (?,?,?,?,?,?,?,?,?,?)').run('historica','Entrega histórica','Intacta','Curso','alta','completada','2026-10-10','2026-10-01T15:00:00.000Z','2026-10-12T15:00:00.000Z',null)
  old.exec("INSERT INTO reminder_events VALUES ('aviso','historica','2026-10-10',0,'2026-10-10','2026-10-10T15:00:00.000Z',NULL,NULL)")
  const before={...old.prepare('SELECT * FROM tasks').get()};old.close()
  let db=openDatabase(path)
  assert.deepEqual({...db.prepare('SELECT * FROM tasks').get()},{...before,completedAt:null,version:1})
  assert.equal(db.prepare('SELECT count(*) AS n FROM reminder_events').get().n,1)
  assert.equal(db.prepare("SELECT count(*) AS n FROM task_events WHERE kind='completed'").get().n,0)
  assert.equal(db.prepare("SELECT occurredAt FROM task_events WHERE kind='created'").get().occurredAt,before.createdAt)
  db.close();db=openDatabase(path)
  assert.equal(db.prepare('SELECT count(*) AS n FROM task_events').get().n,1)
  assert.equal(db.prepare('PRAGMA user_version').get().user_version,5);db.close()
})
test('finalización real, edición, reapertura e importación sin fechas falsas',()=>{
  const db=openDatabase(':memory:')
  try{
    const svc=createTaskService(createTaskRepository(db))
    const task=svc.create(input).task
    const completed=svc.status(task.id,{estado:'completada'})
    assert.ok(completed.completedAt)
    const edited=svc.update(task.id,{...input,titulo:'Título editado',estado:'completada'})
    assert.equal(edited.completedAt,completed.completedAt)
    assert.equal(db.prepare("SELECT count(*) AS n FROM task_events WHERE kind='completed'").get().n,1)
    assert.equal(svc.status(task.id,{estado:'pendiente'}).completedAt,null)
    svc.status(task.id,{estado:'completada'})
    assert.equal(db.prepare("SELECT count(*) AS n FROM task_events WHERE kind='completed'").get().n,2)
    svc.importTasks({tasks:[{...input,id:'legacy-done',estado:'completada',createdAt:'2026-10-01T15:00:00.000Z',updatedAt:'2026-10-12T15:00:00.000Z'}]})
    assert.equal(svc.get('legacy-done').completedAt,null)
    svc.remove(task.id)
    assert.equal(db.prepare("SELECT count(*) AS n FROM task_events WHERE kind='completed'").get().n,2)
  }finally{db.close()}
})
test('metas persisten, progreso cuenta tareas distintas y desactivación conserva historial',t=>{
  const path=temporary(t),db=openDatabase(path)
  const svc=createTaskService(createTaskRepository(db))
  const task=svc.create({...input,estado:'completada'}).task
  const today=localDay(),goals=createGoalService(db)
  const goal=goals.create({nombre:'Objetivo verificable',descripcion:'Avance',fechaInicio:today,fechaFin:today,objetivo:2})
  assert.equal(goal.completed,1);assert.equal(goal.percent,50)
  svc.status(task.id,{estado:'pendiente'});svc.status(task.id,{estado:'completada'})
  assert.equal(goals.list()[0].completed,1)
  goals.toggle(goal.id,{activa:false})
  db.close()
  const reopened=openDatabase(path)
  assert.equal(createGoalService(reopened).list()[0].activa,false)
  assert.equal(createGoalService(reopened).list()[0].completed,1)
  assert.throws(()=>createGoalService(reopened).create({nombre:'a',objetivo:0}))
  reopened.close()
})
test('CSV conserva periodo/distribuciones y neutraliza fórmulas; PDF es A4 real',async()=>{
  const data=report({tasks:[baseTask('a',{categoria:'=SUM(1,2)'})]})
  const csv=createCsv(data)
  assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('ALIRA'))
  assert.ok(csv.includes('2026-10-08'));assert.ok(csv.includes("'=SUM"))
  const pdf=await createPdf(data)
  assert.equal(pdf.subarray(0,4).toString(),'%PDF')
  assert.ok(pdf.length>5000)
  assert.match(pdf.toString('latin1'),/MediaBox \[0 0 595\.28 841\.89\]/)
})
test('API estadísticas, metas, filtros y exportación con revisión consistente',async t=>{
  const db=openDatabase(':memory:'),server=createApp({db}).listen(0,'127.0.0.1')
  await once(server,'listening')
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));db.close()})
  const base='http://127.0.0.1:'+server.address().port+'/api'
  let response=await fetch(base+'/statistics');assert.equal(response.status,200)
  const data=(await response.json()).data,params=new URLSearchParams({from:data.from,to:data.to,revision:data.revision})
  response=await fetch(base+'/statistics/export.csv?'+params);assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/csv/)
  response=await fetch(base+'/statistics/export.pdf?'+params);assert.equal(response.status,200);assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0,4).toString(),'%PDF')
  assert.equal((await fetch(base+'/statistics?from=mal')).status,400)
  const goal={nombre:'Mi meta API',descripcion:'',fechaInicio:localDay(),fechaFin:localDay(),objetivo:3}
  response=await fetch(base+'/goals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(goal)})
  assert.equal(response.status,201);const id=(await response.json()).data.id
  response=await fetch(base+'/goals/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...goal,objetivo:4})});assert.equal((await response.json()).data.objetivo,4)
  response=await fetch(base+'/goals/'+id+'/active',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({activa:false})});assert.equal((await response.json()).data.activa,false)
  createTaskService(createTaskRepository(db)).create(input)
  assert.equal((await fetch(base+'/statistics/export.csv?'+params)).status,409)
  assert.equal((await fetch(base+'/goals/no-existe/active',{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{"activa":false}'})).status,404)
})
