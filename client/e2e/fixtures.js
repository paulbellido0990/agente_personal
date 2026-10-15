import {test as base,expect} from '@playwright/test'
export {expect}
export const test=base.extend({
 request:async({playwright,baseURL},provide)=>{
  const api=baseURL.includes('5175')?'http://127.0.0.1:3012/api':'http://127.0.0.1:3011/api'
  const request=await playwright.request.newContext()
  const r=await request.post(api+'/auth/login',{headers:{'X-Alira-Request':'1'},data:{username:'browser-owner',password:'browser-private-password'}})
  expect(r.ok()).toBe(true)
  const csrf=(await r.json()).data.csrfToken
  const headers={'X-CSRF-Token':csrf}
  // Se conserva la API de Playwright y se añaden precondiciones con datos reales.
  const enhanced=new Proxy(request,{get(target,key){
   if(['put','patch','delete'].includes(key))return async(url,options={})=>{
    const m=new URL(url,baseURL).pathname.match(/^\/api\/(tasks|goals)\/([^/]+)(?:\/(status|active))?$/)
    let version
    if(m){const query=await target.get(api+'/'+m[1]+(m[1]==='tasks'?'/'+m[2]:''));const data=(await query.json()).data;version=m[1]==='tasks'?data?.version:data?.find(t=>t.id===m[2])?.version}
    return target[key](url,{...options,headers:{...headers,...(version?{'If-Match':'"'+version+'"'}:{}),...options.headers}})
   }
   if(key==='post')return (url,options={})=>target.post(url,{...options,headers:{...headers,...options.headers}})
   const value=target[key];return typeof value==='function'?value.bind(target):value
  }})
  await provide(enhanced);await request.dispose()
 },
 context:async({context,request},provide)=>{
  const state=await request.storageState()
  await context.addCookies(state.cookies)
  await provide(context)
 },
})
