import {test} from 'node:test'
import assert from 'node:assert/strict'
import {createTaskApi} from '../src/services/taskApi.js'
test('cambiar de cuenta limpia versiones y utiliza el CSRF de la cuenta actual',async()=>{
 const calls=[]
 let account='1'
 const api=createTaskApi('/api',async(url,options)=>{
  calls.push({url,options})
  if(url.endsWith('/auth/login')){account=JSON.parse(options.body).username;return Response.json({data:{account:{id:account},csrfToken:account==='1'?'token-a':'token-b'}})}
  if(url.endsWith('/tasks')&&options.method==='GET')return Response.json({data:[{id:'same-id',version:7}]})
  return new Response(null,{status:204})
 })
 await api.login({username:'1',password:'fixture-not-real'})
 await api.list()
 await api.login({username:'second',password:'fixture-not-real'})
 await api.remove('same-id')
 assert.equal(calls.at(-1).options.headers['If-Match'],'"0"')
 assert.equal(calls.at(-1).options.headers['X-CSRF-Token'],'token-b')
 assert.equal(calls.at(-1).options.credentials,'include')
})
test('el centro de avisos conserva el tipo y escapa el identificador al marcar leído',async()=>{
 let requested
 const api=createTaskApi('/api',async(url,options)=>{requested={url,options};return Response.json({data:{read:true}})})
 await api.readNotification({id:'test/id',type:'soporte'})
 assert.equal(requested.url,'/api/notifications/soporte/test%2Fid/read')
 assert.equal(requested.options.method,'PATCH')
})
