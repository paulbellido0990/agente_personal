import {HttpError} from '../errors.js'
export function securityHeaders(production){
 return (_req,res,next)=>{
   res.setHeader('X-Content-Type-Options','nosniff')
   res.setHeader('X-Frame-Options','DENY')
   res.setHeader('Referrer-Policy','no-referrer')
   res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()')
   res.setHeader('Cross-Origin-Opener-Policy','same-origin')
   res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"+(production?'; upgrade-insecure-requests':''))
   if(production)res.setHeader('Strict-Transport-Security','max-age=31536000')
   next()
 }
}
// Los handlers de mutación de tareas/metas son síncronos; la comprobación y la escritura
// se realizan bajo el mismo bloqueo SQLite, incluidos procesos concurrentes.
export function conditionalWrite(db){
 return (req,res,next)=>{
   if(!['PUT','PATCH','DELETE'].includes(req.method))return next()
   const academic=req.path.match(/^\/academic\/(terms|courses|sessions|teachers)\/([^/]+)$/)
   const match=academic ? [academic[0],academic[1],academic[2]] : req.path.match(/^\/(tasks|goals)\/([^/]+)(?:\/(status|active))?$/)
   if(!match)return next()
   const originalEnd=res.end
   let pending=false
   try{
     const id=decodeURIComponent(match[2])
     db.exec('BEGIN IMMEDIATE')
     const row=db.prepare('SELECT version FROM '+({tasks:'tasks',goals:'goals',terms:'academic_terms',courses:'courses',sessions:'class_sessions',teachers:'teachers'}[match[1]])+' WHERE id=? AND userId=?').get(id,req.auth.userId)
     if(row){
       const expected=req.headers['if-match']
       if(!expected)throw new HttpError(428,'Actualiza el registro antes de modificarlo: falta su versión.')
       if(expected!=='"'+row.version+'"')throw new HttpError(409,'El registro cambió en otro dispositivo. Actualiza y revisa sus datos antes de reintentar.')
     }
     pending=true
     res.end=function(...args){
       res.end=originalEnd
       try{
         if(db.isTransaction)db.exec(res.statusCode>=400?'ROLLBACK':'COMMIT')
         pending=false
         return originalEnd.apply(this,args)
       }catch(error){
         pending=false
         if(db.isTransaction)db.exec('ROLLBACK')
         next(error)
         return this
       }
     }
     res.once('close',()=>{if(pending&&db.isTransaction){pending=false;db.exec('ROLLBACK')}})
     next()
   }catch(error){res.end=originalEnd;pending=false;if(db.isTransaction)db.exec('ROLLBACK');next(error)}
 }
}
