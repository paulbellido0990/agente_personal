import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createTaskApi, importInBatches } from '../src/services/taskApi.js'
test('servicio HTTP centraliza URL, JSON, método y estado', async () => {
  const calls = []
  const api = createTaskApi('http://api.test/api/', async (...args) => { calls.push(args); return new Response(JSON.stringify({ data: { id: 'a' } }), { status: 200 }) })
  await api.status('id con espacio', 'completada')
  assert.equal(calls[0][0], 'http://api.test/api/tasks/id%20con%20espacio/status')
  assert.equal(calls[0][1].method, 'PATCH')
  assert.deepEqual(JSON.parse(calls[0][1].body), { estado: 'completada' })
})
test('fallos de red y HTTP no se convierten en listas vacías ni éxitos', async () => {
  await assert.rejects(createTaskApi('', async () => { throw new TypeError('Failed to fetch') }).list(), /No se pudo confirmar/)
  await assert.rejects(createTaskApi('', async () => new Response(JSON.stringify({ error: { message: 'Conflicto' } }), { status: 409 })).list(), /Conflicto/)
})
test('importación usa lotes y expone conteos parciales sin borrar originales', async () => {
  const tasks = Array.from({ length: 101 }, (_, i) => ({ id: String(i) }))
  let calls = 0
  await assert.rejects(importInBatches({ importTasks: async batch => { calls++; if (calls === 2) throw new Error('Desconectado'); return { imported: batch.length, skipped: 0 } } }, tasks), /100 importadas/)
  assert.equal(tasks.length, 101)
  const result = await importInBatches({ importTasks: async batch => ({ imported: 0, skipped: batch.length }) }, tasks)
  assert.deepEqual(result, { imported: 0, skipped: 101 })
})

test('importación limita también bytes para descripciones Unicode extensas', async () => {
  const tasks = Array.from({ length: 100 }, (_, i) => ({ id: String(i), descripcion: '漢'.repeat(5000) }))
  let batches = 0
  const result = await importInBatches({ importTasks: async batch => {
    batches++
    assert.ok(new TextEncoder().encode(JSON.stringify({ tasks: batch })).byteLength < 1000000)
    return { imported: batch.length, skipped: 0 }
  } }, tasks)
  assert.ok(batches > 1)
  assert.equal(result.imported, 100)
})
