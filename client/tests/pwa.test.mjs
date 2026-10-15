import {test} from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import {readFileSync} from 'node:fs'
import {workerSource} from '../pwa.mjs'
test('manifest e iconos locales adecuados para instalación',()=>{
 const m=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url)))
 assert.equal(m.name,'ALIRA');assert.equal(m.display,'standalone');assert.equal(m.start_url,'/')
 for(const size of [192,512]){
  const icon=m.icons.find(i=>i.sizes===size+'x'+size)
  const png=readFileSync(new URL('../public'+icon.src,import.meta.url))
  assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size)
 }
 assert.ok(m.icons.some(i=>i.purpose==='maskable'))
})
test('SW solo intercepta recursos estáticos propios y nunca API, escrituras o terceros',async()=>{
 const events={},calls=[]
 const self={location:{origin:'https://alira.test'},addEventListener:(name,handler)=>{events[name]=handler},clients:{claim:async()=>{}},skipWaiting:async()=>{}}
 const context={self,URL,Request,fetch:async request=>{calls.push(request);return 'network'},caches:{open:async()=>({match:async()=>'cached'})}}
 vm.runInNewContext(workerSource('test',['/index.html','/assets/app.js']),context)
 for(const [url,method,mode] of [
  ['https://alira.test/api/tasks','GET','cors'],['https://alira.test/api/tasks','POST','cors'],['https://alira.test/api','GET','navigate'],['https://other.test/assets/app.js','GET','cors'],['https://alira.test/private.pdf','GET','cors'],
 ]){
  let intercepted=false
  events.fetch({request:{url,method,mode},respondWith:()=>{intercepted=true}})
  assert.equal(intercepted,false,url)
 }
 let response
 events.fetch({request:{url:'https://alira.test/assets/app.js',method:'GET',mode:'cors'},respondWith:p=>{response=p}})
 assert.equal(await response,'cached');assert.equal(calls.length,0)
})
test('actualización conserva cachés ajenas y requiere mensaje explícito para activarse',async()=>{
 const handlers={},deleted=[]
 let skips=0,waiting
 const self={addEventListener:(key,fn)=>{handlers[key]=fn},clients:{claim:async()=>{}},skipWaiting:async()=>{skips++}}
 const caches={keys:async()=>['alira-static-old','alira-static-new','otra-app'],delete:async key=>{deleted.push(key)}}
 vm.runInNewContext(workerSource('new',[]),{self,caches})
 handlers.activate({waitUntil:p=>{waiting=p}});await waiting
 assert.deepEqual(deleted,['alira-static-old']);assert.equal(skips,0)
 handlers.message({data:{type:'UNKNOWN'},waitUntil:p=>{waiting=p}});assert.equal(skips,0)
 handlers.message({data:{type:'ACTIVATE_UPDATE'},waitUntil:p=>{waiting=p}});await waiting;assert.equal(skips,1)
})
