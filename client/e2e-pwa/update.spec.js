import {Buffer} from 'node:buffer'
import {test,expect} from '@playwright/test'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {once} from 'node:events'
test('nueva versión espera confirmación, recarga y elimina solo la caché anterior',async({page})=>{
 let version=1
 const root=new URL('../dist/',import.meta.url)
 const server=createServer(async(req,res)=>{
   const name=new URL(req.url,'http://localhost').pathname
   if(name.startsWith('/api/')){
     res.setHeader('Content-Type','application/json')
     res.end(JSON.stringify({data:[]}));return
   }
   try{
     let data=await readFile(new URL(name==='/'?'index.html':name.slice(1),root))
     if(name==='/sw.js')data=Buffer.from(data.toString().replace(/alira-static-[a-z0-9]+/,'alira-static-update'+version))
     const extension=name.split('.').at(-1)
     res.setHeader('Content-Type',({js:'text/javascript',css:'text/css',png:'image/png',svg:'image/svg+xml',webmanifest:'application/manifest+json'})[extension]||'text/html')
     res.setHeader('Cache-Control','no-store');res.end(data)
   }catch{res.statusCode=404;res.end()}
 }).listen(0,'127.0.0.1')
 await once(server,'listening')
 try{
   await page.goto('http://127.0.0.1:'+server.address().port)
   await page.evaluate(async()=>{await navigator.serviceWorker.ready})
   await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true)
   await page.evaluate(async()=>{await caches.open('cache-ajena')})
   version=2
   await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update()})
   await expect(page.getByRole('button',{name:'Actualizar ALIRA',exact:true})).toBeVisible()
   expect(await page.evaluate(async()=>(await caches.keys()).includes('alira-static-update1'))).toBe(true)
   await Promise.all([page.waitForEvent('domcontentloaded'),page.getByRole('button',{name:'Actualizar ALIRA',exact:true}).click()])
   await expect.poll(()=>page.evaluate(async()=>await caches.keys())).toContain('alira-static-update2')
   await expect(page.getByRole('heading',{name:'Tu espacio para avanzar',exact:true})).toBeVisible()
   const keys=await page.evaluate(async()=>await caches.keys())
   expect(keys).not.toContain('alira-static-update1');expect(keys).toContain('cache-ajena')
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r))}
})
