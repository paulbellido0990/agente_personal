import {test} from 'node:test'
import assert from 'node:assert/strict'
import {once} from 'node:events'
import {openDatabase} from '../src/db/database.js'
import {createApp,authenticatedFetch as fetch} from './helpers/authenticated.js'
test('IA retirada: rutas inactivas y conversaciones históricas preservadas',async t=>{
 const db=openDatabase(':memory:')
 const date='2026-10-14T18:00:00.000Z'
 db.prepare('INSERT INTO conversations VALUES (?,?,?,?)').run('historica','Historial conservado',date,date)
 db.prepare('INSERT INTO conversation_messages VALUES (?,?,?,?,?,?,?)').run('mensaje','historica','user','text','Mensaje histórico',null,date)
 const before=JSON.stringify(db.prepare('SELECT * FROM conversations').all())
 const server=createApp({db}).listen(0,'127.0.0.1')
 await once(server,'listening')
 t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));db.close()})
 const base='http://127.0.0.1:'+server.address().port
 assert.equal((await fetch(base+'/api/assistant/status')).status,404)
 assert.equal((await fetch(base+'/api/assistant/conversations')).status,404)
 assert.equal((await fetch(base+'/api/health')).status,200)
 assert.equal((await fetch(base+'/api/tasks')).status,200)
 assert.equal(JSON.stringify(db.prepare('SELECT * FROM conversations').all()),before)
 assert.equal(db.prepare('SELECT content FROM conversation_messages').get().content,'Mensaje histórico')
 assert.equal(db.prepare('PRAGMA user_version').get().user_version,6)
})
