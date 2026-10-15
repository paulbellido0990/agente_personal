// Ayudas exclusivas de pruebas: se autentican por el endpoint real, sin omitir middleware.
import {createApp as realCreateApp} from '../../src/app.js'
import {hashPassword} from '../../src/services/passwords.js'
const username='fixture-owner',password='fixture-private-password'
const hash=await hashPassword(password)
export function createApp(options){
 if(!options.db.prepare('SELECT id FROM owner').get()){
  const now=new Date().toISOString()
  options.db.prepare('INSERT INTO owner VALUES (1,?,?,?,?)').run(username,hash,now,now)
 }
 return realCreateApp(options)
}
const sessions=new Map()
export async function authenticatedFetch(url,options={}){
 const origin=new URL(url).origin
 let auth=sessions.get(origin)
 if(!auth){
  const r=await globalThis.fetch(origin+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Alira-Request':'1'},body:JSON.stringify({username,password})})
  if(!r.ok)throw new Error('No se pudo autenticar la prueba: '+r.status)
  auth={cookie:r.headers.get('set-cookie').split(';')[0],csrf:(await r.json()).data.csrfToken}
  sessions.set(origin,auth)
 }
 const headers=new Headers(options.headers)
 headers.set('Cookie',auth.cookie);headers.set('X-CSRF-Token',auth.csrf)
 const path=new URL(url).pathname
 if(['PUT','PATCH','DELETE'].includes(options.method)){
  const m=path.match(/^\/api\/(tasks|goals)\/([^/]+)(?:\/(status|active))?$/)
  if(m&&!headers.has('If-Match')){
   const response=await globalThis.fetch(origin+'/api/'+m[1]+(m[1]==='tasks'?'/'+m[2]:''),{headers:{Cookie:auth.cookie}})
   const result=await response.json()
   const record=m[1]==='tasks'?result.data:result.data?.find(x=>x.id===m[2])
   if(record)headers.set('If-Match','"'+record.version+'"')
  }
 }
 return globalThis.fetch(url,{...options,headers})
}
