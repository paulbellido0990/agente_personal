import {localDay} from '../../shared/tasks.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { spawn } from 'node:child_process'
import { openDatabase } from '../src/db/database.js'
import { createApp, authenticatedFetch as fetch } from './helpers/authenticated.js'
const input = { titulo: 'Preparar informe', descripcion: 'Revisar fuentes', categoria: 'Estudio', prioridad: 'alta', estado: 'pendiente', fechaLimite: '2026-10-15' }
async function fixture(t, file = false) {
  const root = file ? mkdtempSync(join(tmpdir(), 'alira-api-test-')) : null
  const dbPath = root ? join(root, 'tasks.db') : ':memory:'
  const db = openDatabase(dbPath)
  const server = createApp({ db }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const url = 'http://127.0.0.1:' + server.address().port
  t.after(async () => {
    server.closeAllConnections()
    await new Promise(resolve => server.close(resolve))
    db.close()
    if (root) {
      assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep) && root.includes('alira-api-test-'))
      rmSync(root, { recursive: true, force: true })
    }
  })
  async function request(path, method = 'GET', body, headers = {}) {
    const response = await fetch(url + path, { method, headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) })
    return { status: response.status, headers: response.headers, json: response.status === 204 ? null : await response.json() }
  }
  return { request, db, dbPath }
}
test('siete endpoints: health, crear, listar, consultar, editar, estado y eliminar', async t => {
  const { request, db } = await fixture(t)
  assert.equal((await request('/api/health')).json.data.status, 'ok')
  const created = await request('/api/tasks', 'POST', input)
  assert.equal(created.status, 201)
  const task = created.json.data
  assert.equal(db.prepare('SELECT count(*) AS n FROM tasks').get().n, 1)
  assert.equal((await request('/api/tasks')).json.data.length, 1)
  assert.equal((await request('/api/tasks/' + task.id)).json.data.id, task.id)
  const updated = await request('/api/tasks/' + task.id, 'PUT', { ...input, titulo: 'Informe actualizado', prioridad: 'baja', categoria: 'Personal', descripcion: '', fechaLimite: null })
  assert.equal(updated.status, 200)
  assert.equal(updated.json.data.createdAt, task.createdAt)
  assert.equal(updated.json.data.id, task.id)
  assert.equal(updated.json.data.titulo, 'Informe actualizado')
  assert.equal((await request('/api/tasks/' + task.id + '/status', 'PATCH', { estado: 'completada' })).json.data.estado, 'completada')
  assert.equal((await request('/api/tasks/' + task.id, 'DELETE')).status, 204)
  assert.equal((await request('/api/tasks/' + task.id)).status, 404)
  assert.equal((await request('/api/tasks')).json.data.length, 0)
})
test('validación, JSON, límites, campos desconocidos, IDs y rutas inexistentes', async t => {
  const { request } = await fixture(t)
  for (const body of [null, [], {}, { ...input, titulo: 'a' }, { ...input, fechaLimite: '2026-02-30' }, { ...input, fechaLimite: 0 }, { ...input, prioridad: 'urgente' }, { ...input, estado: '__proto__' }, { ...input, extra: true }]) {
    assert.equal((await request('/api/tasks', 'POST', body)).status, 400)
  }
  assert.equal((await request('/api/tasks', 'POST', '{oops')).status, 400)
  assert.equal((await request('/api/tasks', 'POST', { ...input, descripcion: 'x'.repeat(1100000) })).status, 413)
  assert.equal((await request('/api/tasks', 'POST', 'hola', { 'Content-Type': 'text/plain' })).status, 415)
  assert.equal((await request('/desconocida')).status, 404)
  assert.equal((await request('/api/tasks/abc%27')).status, 400)
  assert.equal((await request('/api/tasks/no-existe/status', 'PATCH', { estado: 'completada' })).status, 404)
  assert.equal((await request('/api/tasks/no-existe/status', 'PATCH', { estado: 'completada', titulo: 'extra' })).status, 400)
})
test('CORS restringido y preflight', async t => {
  const { request } = await fixture(t)
  assert.equal((await request('/api/health', 'GET', undefined, { Origin: 'https://otro.example' })).status, 403)
  const allowed = await request('/api/health', 'GET', undefined, { Origin: 'http://localhost:5173' })
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173')
  assert.equal((await request('/api/tasks', 'OPTIONS', undefined, { Origin: 'http://localhost:5173' })).status, 204)
})
test('filtros combinables y orden; valores de usuario no ejecutan SQL', async t => {
  const { request, db } = await fixture(t)
  await request('/api/tasks', 'POST', { ...input, titulo: "Informe '; DROP TABLE tasks;--" })
  await request('/api/tasks', 'POST', { ...input, prioridad: 'baja', categoria: 'Personal', fechaLimite: null })
  const found = await request('/api/tasks?q=DROP&estado=pendiente&prioridad=alta&categoria=Estudio&sort=fechaLimite&order=desc')
  assert.equal(found.json.data.length, 1)
  const sorted = await request('/api/tasks?sort=prioridad&order=desc')
  assert.equal(sorted.json.data[0].prioridad, 'baja')
  assert.equal(db.prepare('SELECT count(*) AS n FROM tasks').get().n, 2)
  for (const query of ['sort=malicioso','estado=hecha','order=otro','q=a&q=b','desconocido=x']) assert.equal((await request('/api/tasks?' + query)).status, 400)
})
test('restricciones SQLite impiden registros inválidos y esquema es idempotente', async t => {
  const { db, dbPath } = await fixture(t, true)
  const other = openDatabase(dbPath)
  other.close()
  const created = { ...input, id: 'integridad', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  assert.throws(() => db.prepare('INSERT INTO tasks (id,titulo,descripcion,categoria,prioridad,estado,fechaLimite,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)').run(created.id, 'a', '', 'Estudio', 'alta', 'pendiente', null, created.createdAt, created.updatedAt))
  assert.throws(() => db.prepare('INSERT INTO tasks (id,titulo,descripcion,categoria,prioridad,estado,fechaLimite,createdAt,updatedAt) VALUES (?,?,?,?,?,?,?,?,?)').run(created.id, created.titulo, '', 'Estudio', 'alta', 'pendiente', '2026-02-30', created.createdAt, created.updatedAt))
})
test('POST idempotente: repetir ID y contenido no duplica; un conflicto no sobrescribe', async t => {
  const { request } = await fixture(t)
  const body = { ...input, id: 'retry-stable' }
  assert.equal((await request('/api/tasks', 'POST', body)).status, 201)
  assert.equal((await request('/api/tasks', 'POST', body)).status, 200)
  assert.equal((await request('/api/tasks', 'POST', { ...body, titulo: 'Conflicto' })).status, 409)
  assert.equal((await request('/api/tasks')).json.data.length, 1)
})
test('importación atómica, reintentos, preservación de fechas y rechazo de demo', async t => {
  const { request } = await fixture(t)
  const task = { ...input, id: 'local-1', createdAt: '2026-10-14T15:00:00.000Z', updatedAt: '2026-10-14T16:00:00.000Z' }
  const first = await request('/api/tasks/import', 'POST', { tasks: [task] })
  assert.deepEqual(first.json.data, { imported: 1, skipped: 0 })
  assert.deepEqual((await request('/api/tasks/import', 'POST', { tasks: [task] })).json.data, { imported: 0, skipped: 1 })
  assert.equal((await request('/api/tasks/local-1')).json.data.createdAt, task.createdAt)
  const conflict = await request('/api/tasks/import', 'POST', { tasks: [{ ...task, id: 'nuevo-rollback' }, { ...task, titulo: 'Conflicto' }] })
  assert.equal(conflict.status, 409)
  assert.equal((await request('/api/tasks/nuevo-rollback')).status, 404)
  assert.equal((await request('/api/tasks/import', 'POST', { tasks: [{ ...task, id: 'demo-1' }] })).status, 400)
  assert.equal((await request('/api/tasks/import', 'POST', { tasks: [task, task] })).status, 400)
})
test('archivo SQLite mantiene datos tras cerrar y reabrir conexiones', async t => {
  const { dbPath, request } = await fixture(t, true)
  const task = (await request('/api/tasks', 'POST', input)).json.data
  assert.ok(existsSync(dbPath))
  const connection = openDatabase(dbPath)
  assert.equal(connection.prepare('SELECT titulo FROM tasks WHERE id=?').get(task.id).titulo, input.titulo)
  connection.close()
})
test('proceso real inicia, se detiene y reinicia conservando SQLite', async t => {
  const root = mkdtempSync(join(tmpdir(), 'alira-api-process-'))
  const path = join(root, 'persist.db')
  const children = []
  t.after(() => {
    for (const child of children) if (child.exitCode === null) child.kill()
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep) && root.includes('alira-api-process-'))
    rmSync(root, { recursive: true, force: true })
  })
  async function run() {
    // Puerto efímero de prueba, sin afectar el servidor personal.
    const child = spawn(process.execPath, ['--input-type=module', '-e', "import { openDatabase } from './src/db/database.js'; import { createApp } from './tests/helpers/authenticated.js'; const db=openDatabase(process.env.ALIRA_TEST_DB); const server=createApp({db,now:()=>new Date('2026-10-14T18:00:00Z')}).listen(0,'127.0.0.1',()=>console.log(server.address().port));"], { cwd: new URL('../', import.meta.url), env: { ...process.env, ALIRA_TEST_DB: path }, stdio: ['ignore','pipe','pipe'] })
    children.push(child)
    const port = await new Promise((resolve, reject) => {
      let output = ''
      child.stdout.on('data', chunk => { output += chunk; if (output.includes('\n')) resolve(Number(output.trim())) })
      child.once('error', reject)
      child.once('exit', () => reject(new Error('No inició el proceso de prueba.')))
    })
    return { child, url: 'http://127.0.0.1:' + port }
  }
  const first = await run()
  const created = await fetch(first.url + '/api/tasks', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({...input,recordatorio:1}) }).then(r => r.json())
  const beforeEvents=await fetch(first.url+'/api/reminders').then(r=>r.json())
  assert.equal(beforeEvents.data.length,1)
  const createdGoal=await fetch(first.url+'/api/goals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre:'Meta que persiste',fechaInicio:localDay(),fechaFin:localDay(),objetivo:5})}).then(r=>r.json())
  assert.ok(createdGoal.data.id)
  const exited = once(first.child, 'exit'); first.child.kill(); await exited
  const second = await run()
  const found = await fetch(second.url + '/api/tasks/' + created.data.id).then(r => r.json())
  assert.equal(found.data.titulo, input.titulo)
  const afterEvents=await fetch(second.url+'/api/reminders').then(r=>r.json())
  assert.equal(afterEvents.data[0].id,beforeEvents.data[0].id)
  assert.equal(afterEvents.data.length,1)
  const restartedGoals=await fetch(second.url+'/api/goals').then(r=>r.json())
  assert.equal(restartedGoals.data.find(g=>g.id===createdGoal.data.id).objetivo,5)
  const stopped = once(second.child, 'exit'); second.child.kill(); await stopped
})
