import express from 'express'
import {platformRoutes} from './routes/platform.js'
import {requireAdmin} from './services/platformValidation.js'
import {academicRoutes} from './routes/academic.js'
import {join} from 'node:path'
import {statisticsRoutes} from './routes/statistics.js'
import {reminderRoutes} from './routes/reminders.js'
import {createTaskRepository} from './repositories/taskRepository.js'
import {createTaskService} from './services/taskService.js'
import {taskRoutes} from './routes/tasks.js'
import {HttpError,errorHandler} from './errors.js'
import {createAuthService} from './services/authService.js'
import {securityHeaders,conditionalWrite} from './middleware/security.js'
import {downloadableBackup} from './services/backupService.js'
export function createApp({db,origin='http://localhost:5173',now,production=false,sessionHours=168,trustProxy=false,staticDir=null}){
 const app=express(),auth=createAuthService(db,{production,sessionHours,now})
 app.disable('x-powered-by');app.set('trust proxy',trustProxy)
 app.use(securityHeaders(production))
 app.use((req,_res,next)=>{if(production&&!req.secure&&req.path!=='/api/health')return next(new HttpError(426,'La conexión requiere HTTPS.'));next()})
 app.use('/api',(req,res,next)=>{
   res.setHeader('Cache-Control','no-store')
   res.setHeader('Vary','Origin')
   if(production&&!req.secure&&req.path!=='/health')return next(new HttpError(426,'La conexión requiere HTTPS.'))
   if(req.headers.origin&&req.headers.origin!==origin)return next(new HttpError(403,'Origen no permitido.'))
   if(req.headers.origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true')}
   res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,PATCH,DELETE,OPTIONS')
   res.setHeader('Access-Control-Allow-Headers','Content-Type,X-CSRF-Token,X-Alira-Request,If-Match')
   if(req.method==='OPTIONS')return res.status(204).end()
   if(!['GET','HEAD'].includes(req.method)&&req.headers['sec-fetch-site']==='cross-site')return next(new HttpError(403,'Solicitud no permitida.'))
   next()
 })
 // Autenticación antes de analizar cuerpos privados; la salud y sesión son públicos.
 app.get('/api/health',(_req,res)=>{db.prepare('SELECT 1').get();res.json({data:{status:'ok'}})})
 app.get('/api/auth/session',(req,res)=>res.json({data:auth.info(req)}))
 app.post('/api/auth/login',(req,_res,next)=>{
   if(req.headers['x-alira-request']!=='1')return next(new HttpError(403,'Solicitud de acceso no válida.'))
   next()
 },express.json({limit:'4kb',strict:true}),async(req,res)=>res.json({data:await auth.login(req,res)}))
 app.post('/api/auth/invitation',(req,_res,next)=>{if(req.headers['x-alira-request']!=='1')return next(new HttpError(403,'Solicitud no válida.'));next()},express.json({limit:'4kb',strict:true}),async(req,res)=>res.json({data:await auth.acceptInvitation(req)}))
 app.use('/api',auth.require)
 app.use('/api',(req,_res,next)=>{try{auth.limit('api:'+req.auth.tokenHash,600,60000);next()}catch(e){next(e)}})
 app.use('/api',auth.protect)
 app.use('/api',(req,_res,next)=>{
   if(['POST','PUT','PATCH'].includes(req.method)&&!req.is('application/json'))return next(new HttpError(415,'Envía Content-Type: application/json.'))
   next()
 })
 app.use('/api',express.json({limit:'1mb',strict:true}))
 app.post('/api/auth/logout',(req,res)=>{auth.logout(req,res);res.status(204).end()})
 app.post('/api/auth/password',async(req,res)=>res.json({data:await auth.changePassword(req,res)}))
 app.get('/api/settings',(_req,res)=>res.json({data:{version:'0.9.0',storage:'SQLite centralizada',backup:'Descarga protegida; las copias contienen datos privados y el hash de acceso.'}}))
 app.post('/api/settings/backup',requireAdmin,async(req,res)=>{
   if(!req.body||Object.keys(req.body).some(k=>k!=='currentPassword'))throw new HttpError(400,'Datos de respaldo no válidos.')
   await auth.reauthenticate(req,req.body.currentPassword)
   const result=await downloadableBackup(db)
   db.prepare('INSERT INTO admin_audit_log VALUES(?,?,?,?,?)').run(crypto.randomUUID(),req.auth.userId,'respaldo.generado',null,new Date().toISOString())
   res.download(result.path,result.name,error=>{
     result.cleanup().catch(()=>console.error('No se pudo limpiar un respaldo temporal.'))
     if(error&&!res.headersSent)res.status(500).json({error:{message:'No se pudo descargar el respaldo.'}})
   })
 })
 app.use('/api',platformRoutes(db,auth,now))
 const personalRouters=new Map()
 app.use('/api',(req,res,next)=>{
  const userId=req.auth.userId
  if(!personalRouters.has(userId)){
   const router=express.Router()
   router.use(conditionalWrite(db))
   router.use('/academic',academicRoutes(db,now,userId))
   router.use(statisticsRoutes(db,now,userId))
   router.use('/reminders',reminderRoutes(db,now,userId))
   router.use('/tasks',taskRoutes(createTaskService(createTaskRepository(db,userId))))
   personalRouters.set(userId,router)
  }
  return personalRouters.get(userId)(req,res,next)
 })
 app.use('/api',(_req,_res,next)=>next(new HttpError(404,'La ruta solicitada no existe.')))
 if(staticDir){
   app.use(express.static(staticDir,{index:false,dotfiles:'deny',setHeaders(res,path){
     res.setHeader('Cache-Control',path.includes('/assets/')||path.includes('\\assets\\')?'public,max-age=31536000,immutable':'no-cache')
   }}))
   app.get('/',(_req,res)=>{res.setHeader('Cache-Control','no-cache');res.sendFile(join(staticDir,'index.html'))})
 }
 app.use((_req,_res,next)=>next(new HttpError(404,'La ruta solicitada no existe.')))
 app.use(errorHandler)
 return app
}
