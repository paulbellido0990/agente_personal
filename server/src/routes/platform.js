import {Router} from 'express'
import {createAdminService} from '../services/adminService.js'
import {createCommunicationService} from '../services/communicationService.js'
import {createShareService} from '../services/shareService.js'
import {createReminderService} from '../services/reminderService.js'
import {requireAdmin,input} from '../services/platformValidation.js'
import {HttpError} from '../errors.js'
export function platformRoutes(db,auth,now=()=>new Date()){
 const router=Router(),admin=createAdminService(db,now)
 const communication=req=>createCommunicationService(db,req.auth.account,now)
 router.get('/communications',(req,res)=>res.json({data:communication(req).snapshot()}))
 router.get('/communications/threads/:id',(req,res)=>res.json({data:communication(req).messages(req.params.id)}))
 router.post('/communications/threads',(req,res)=>{auth.limit('thread-create:'+req.auth.userId,20,3600000);res.status(201).json({data:communication(req).create(req.body)})})
 router.post('/communications/threads/:id/messages',(req,res)=>{auth.limit('message:'+req.auth.userId,30,60000);res.status(201).json({data:communication(req).reply(req.params.id,req.body)})})
 router.patch('/communications/threads/:id/status',requireAdmin,(req,res)=>{
  const data=communication(req).status(req.params.id,req.body,req.headers['if-match'])
  admin.audit(req.auth.userId,'soporte.estado',req.params.id);res.json({data})
 })
 router.get('/notifications',(req,res)=>{
  const reminders=createReminderService(db,now,req.auth.userId).list().map(e=>({...e,type:'recordatorio'}))
  res.json({data:[...reminders,...communication(req).notifications()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt))})
 })
 router.patch('/notifications/:type/:id/read',(req,res)=>{
  const {type,id}=req.params,service=communication(req)
  if(type==='recordatorio')createReminderService(db,now,req.auth.userId).read(id)
  else if(type==='anuncio')service.readAnnouncement(id)
  else if(['mensaje','soporte'].includes(type))service.markThread(id)
  else throw new HttpError(400,'Tipo de aviso no válido.')
  res.json({data:{read:true}})
 })
 router.get('/shares',(req,res)=>{const service=createShareService(db,req.auth.userId,now);res.json({data:{items:service.list(),resources:service.ownedResources()}})})
 router.post('/shares',(req,res)=>res.status(201).json({data:createShareService(db,req.auth.userId,now).create(req.body)}))
 router.get('/shares/:id',(req,res)=>res.json({data:createShareService(db,req.auth.userId,now).get(req.params.id)}))
 router.delete('/shares/:id',(req,res)=>res.json({data:createShareService(db,req.auth.userId,now).revoke(req.params.id)}))
 router.use('/control',requireAdmin)
 router.get('/control/dashboard',(_req,res)=>res.json({data:admin.dashboard()}))
 router.get('/control/users',(_req,res)=>res.json({data:admin.users()}))
 router.post('/control/invitations',(req,res)=>{auth.limit('invite:'+req.auth.userId,20,3600000);res.status(201).json({data:admin.invite(req.body,req.auth.userId)})})
 router.post('/control/users/:id/actions',async(req,res)=>{
  input(req.body,['action','currentPassword'])
  if(req.body.action==='recuperar')await auth.reauthenticate(req,req.body.currentPassword)
  res.json({data:admin.manage(req.params.id,{action:req.body.action},req.auth.userId)})
 })
 router.get('/control/announcements',(_req,res)=>res.json({data:admin.announcements()}))
 router.post('/control/announcements',(req,res)=>res.status(201).json({data:admin.saveAnnouncement(req.body,null,null,req.auth.userId)}))
 router.put('/control/announcements/:id',(req,res)=>res.json({data:admin.saveAnnouncement(req.body,req.params.id,req.headers['if-match'],req.auth.userId)}))
 router.get('/control/audit',(_req,res)=>res.json({data:admin.auditLog()}))
 router.get('/control/settings',(_req,res)=>res.json({data:admin.settings()}))
 router.put('/control/settings',(req,res)=>res.json({data:admin.saveSettings(req.body,req.headers['if-match'],req.auth.userId)}))
 return router
}
