import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { once } from 'node:events'
import { openDatabase } from '../src/db/database.js'
import { createTaskRepository } from '../src/repositories/taskRepository.js'
import { createTaskService } from '../src/services/taskService.js'
import { createReminderService } from '../src/services/reminderService.js'
import { createApp, authenticatedFetch as fetch } from './helpers/authenticated.js'
const input = {titulo:'Entrega real',descripcion:'Detalles',categoria:'Estudio',prioridad:'alta',estado:'pendiente',fechaLimite:'2026-10-15'}
function temporary(t) {
  const root = mkdtempSync(join(tmpdir(),'alira-reminders-test-'))
  t.after(() => { assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep) && root.includes('alira-reminders-test-')); rmSync(root,{recursive:true,force:true}) })
  return join(root,'test.db')
}
test('migra v1 a la versión actual sin cambiar tareas; reapertura idempotente y ledger persistente', t => {
  const path = temporary(t)
  const old = new DatabaseSync(path)
  old.exec(readFileSync(new URL('../src/db/schema.sql',import.meta.url),'utf8'))
  old.prepare('INSERT INTO tasks VALUES (?,?,?,?,?,?,?,?,?)').run('original','Título original','Descripción intacta','Curso','alta','pendiente','2026-10-15','2026-10-10T15:00:00.000Z','2026-10-10T15:00:00.000Z')
  const original = {...old.prepare('SELECT * FROM tasks').get()}
  old.close()
  let db = openDatabase(path)
  const migrated = {...db.prepare('SELECT * FROM tasks').get()}
  assert.deepEqual(migrated,{...original,recordatorio:null,completedAt:null,version:1})
  assert.equal(db.prepare('PRAGMA user_version').get().user_version,5)
  const tasks = createTaskService(createTaskRepository(db))
  tasks.update('original',{...input,recordatorio:1})
  let reminders = createReminderService(db,()=>new Date('2026-10-14T18:00:00Z'))
  const event = reminders.list()[0]
  reminders.read(event.id)
  assert.equal(reminders.claim(event.id).claimed,false)
  db.close()
  db = openDatabase(path)
  reminders = createReminderService(db,()=>new Date('2026-10-14T18:00:00Z'))
  assert.equal(reminders.list().length,1)
  assert.equal(reminders.list()[0].id,event.id)
  assert.ok(reminders.list()[0].readAt)
  db.close()
})
test('migración fallida se revierte íntegramente, sin adelantar versión ni borrar datos', t => {
  const path = temporary(t)
  const db = new DatabaseSync(path)
  db.exec(readFileSync(new URL('../src/db/schema.sql',import.meta.url),'utf8'))
  db.exec('CREATE TABLE reminder_events (id TEXT)')
  db.close()
  assert.throws(()=>openDatabase(path))
  const check = new DatabaseSync(path)
  assert.equal(check.prepare('PRAGMA user_version').get().user_version,1)
  assert.equal(check.prepare("PRAGMA table_info(tasks)").all().some(c=>c.name==='recordatorio'),false)
  check.close()
})
test('avisos por día local, offsets, apagado, completadas y cambios de fecha', () => {
  const db = openDatabase(':memory:')
  try {
    let current = new Date('2026-10-15T02:00:00Z') // Todavía 14 en Lima.
    const tasks = createTaskService(createTaskRepository(db))
    const reminders = createReminderService(db,()=>current)
    const task = tasks.create({...input,recordatorio:1}).task
    assert.equal(reminders.list().length,1)
    assert.equal(reminders.list()[0].triggerDate,'2026-10-14')
    assert.equal(reminders.list()[0].taskId,task.id)
    assert.equal(reminders.list().length,1)
    tasks.update(task.id,{...input,recordatorio:null})
    assert.equal(reminders.list().length,0)
    tasks.update(task.id,{...input,fechaLimite:'2026-10-20',recordatorio:3})
    assert.equal(reminders.list().length,0)
    current = new Date('2026-10-17T15:00:00Z')
    assert.equal(reminders.list().length,1)
    tasks.status(task.id,{estado:'completada'})
    assert.equal(reminders.list().length,0)
    tasks.status(task.id,{estado:'pendiente'})
    assert.equal(reminders.list().length,1)
    tasks.remove(task.id)
    assert.equal(db.prepare('SELECT count(*) AS n FROM reminder_events').get().n,0)
  } finally {db.close()}
})
test('dos conexiones reclaman un aviso una sola vez; leer es idempotente', t => {
  const path=temporary(t)
  const db=openDatabase(path)
  const task=createTaskService(createTaskRepository(db)).create({...input,recordatorio:3}).task
  const db2=openDatabase(path)
  try {
    const now=()=>new Date('2026-10-14T15:00:00Z')
    const a=createReminderService(db,now),b=createReminderService(db2,now)
    const id=a.list()[0].id
    assert.equal(a.claim(id).claimed,true)
    assert.equal(b.claim(id).claimed,false)
    a.read(id);a.read(id)
    assert.ok(b.list()[0].readAt)
    assert.equal(b.list()[0].taskId,task.id)
  } finally {db2.close();db.close()}
})
test('API: rangos, configuración inválida, lectura y reclamación', async t => {
  const db=openDatabase(':memory:')
  const server=createApp({db,now:()=>new Date('2026-10-14T18:00:00Z')}).listen(0,'127.0.0.1')
  await once(server,'listening')
  t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));db.close()})
  const base='http://127.0.0.1:'+server.address().port+'/api'
  const request=async(path,method='GET',body)=> {
    const response=await fetch(base+path,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})})
    return {status:response.status,json:await response.json()}
  }
  for(const recordatorio of [2,'1',true]) assert.equal((await request('/tasks','POST',{...input,recordatorio})).status,400)
  assert.equal((await request('/tasks','POST',{...input,fechaLimite:null,recordatorio:0})).status,400)
  const task=(await request('/tasks','POST',{...input,recordatorio:1})).json.data
  assert.equal(task.recordatorio,1)
  assert.equal((await request('/tasks?from=2026-10-15&to=2026-10-15')).json.data.length,1)
  assert.equal((await request('/tasks?from=2026-10-16')).json.data.length,0)
  assert.equal((await request('/tasks?from=2026-10-16&to=2026-10-14')).status,400)
  assert.equal((await request('/tasks?from=2026-02-30')).status,400)
  const event=(await request('/reminders')).json.data[0]
  assert.equal((await request('/reminders/'+event.id+'/claim','POST',{})).json.data.claimed,true)
  assert.equal((await request('/reminders/'+event.id+'/claim','POST',{})).json.data.claimed,false)
  assert.equal((await request('/reminders/'+event.id+'/read','PATCH',{})).status,200)
  assert.ok((await request('/reminders')).json.data[0].readAt)
  assert.equal((await request('/reminders/no-existe/read','PATCH',{})).status,404)
})
