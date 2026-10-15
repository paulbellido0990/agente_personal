import {mkdtempSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {openDatabase} from '../src/db/database.js'
import {initializeOwner} from '../src/services/passwords.js'
import {createApp} from '../src/app.js'
const db=openDatabase(join(mkdtempSync(join(tmpdir(),'alira-e2e-')),'browser.db'))
await initializeOwner(db,'browser-owner','browser-private-password')
const server=createApp({db,origin:process.env.ALIRA_TEST_ORIGIN||'http://127.0.0.1:5174'}).listen(Number(process.env.ALIRA_TEST_PORT||3011),'127.0.0.1')
const stop=()=>server.close(()=>{db.close();process.exit(0)})
process.on('SIGTERM',stop);process.on('SIGINT',stop)
