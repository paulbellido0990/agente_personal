import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto'
import {hashPassword,verifyPassword} from './passwords.js'
import {HttpError} from '../errors.js'
const digest=value=>createHash('sha256').update(value).digest('hex')
const csrf=token=>createHmac('sha256',token).update('alira.csrf.v1').digest('hex')
const equal=(a,b)=>typeof a==='string'&&/^[a-f0-9]{64}$/.test(a)&&timingSafeEqual(Buffer.from(a),Buffer.from(b))
export function createAuthService(db,{production=false,sessionHours=168,now=()=>new Date()}={}){
 const cookieName=production?'__Host-alira.sid':'alira.sid'
 const owner=()=>db.prepare('SELECT id,username,createdAt,updatedAt FROM owner WHERE id=1').get()
 let pendingHashes=0
 function tokenFrom(req){
   const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1)
   return raw&&/^[a-f0-9]{64}$/.test(raw)?raw:null
 }
 function cookie(res,token,seconds){
   res.setHeader('Set-Cookie',cookieName+'='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+seconds+(production?'; Secure':''))
 }
 function session(req){
   const token=tokenFrom(req)
   if(!token)return null
   const row=db.prepare('SELECT * FROM sessions WHERE tokenHash=? AND expiresAt>?').get(digest(token),now().toISOString())
   return row?{...row,token,csrfToken:csrf(token),account:owner()}:null
 }
 function limit(key,max,windowMs){
   const current=now().getTime()
   db.prepare('DELETE FROM auth_attempts WHERE resetAt<=?').run(current)
   const old=db.prepare('SELECT * FROM auth_attempts WHERE key=?').get(key)
   if(old&&old.attempts>=max)throw new HttpError(429,'Demasiados intentos. Espera antes de volver a intentarlo.')
   db.prepare('INSERT INTO auth_attempts VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1').run(key,current+windowMs)
 }
 return {
   cookieName,session,limit,
   info(req){const s=session(req);return {configured:!!owner(),authenticated:!!s,...(s?{account:s.account,csrfToken:s.csrfToken,expiresAt:s.expiresAt}:{})}},
   async login(req,res){
     limit('login-ip:'+digest(req.ip),5,15*60000)
     limit('login-global',30,15*60000)
     const body=req.body
     if(!body||Object.keys(body).some(k=>!['username','password'].includes(k))||typeof body.username!=='string'||typeof body.password!=='string'||body.username.length>80||body.password.length>128)throw new HttpError(400,'Credenciales no válidas.')
     const account=db.prepare('SELECT * FROM owner WHERE id=1').get()
     if(!account)throw new HttpError(503,'La cuenta aún no está configurada. El propietario debe configurarla desde la terminal del servidor.')
     if(pendingHashes>=2)throw new HttpError(429,'Hay solicitudes de acceso en curso. Inténtalo más tarde.')
     pendingHashes++
     let valid
     try{valid=await verifyPassword(body.password,account.passwordHash)}finally{pendingHashes--}
     if(!valid||body.username!==account.username||db.prepare('SELECT passwordHash FROM owner WHERE id=1').get().passwordHash!==account.passwordHash)throw new HttpError(401,'Usuario o contraseña incorrectos.')
     db.prepare('DELETE FROM auth_attempts WHERE key=?').run('login-ip:'+digest(req.ip))
     const previous=tokenFrom(req)
     if(previous)db.prepare('DELETE FROM sessions WHERE tokenHash=?').run(digest(previous))
     db.prepare('DELETE FROM sessions WHERE expiresAt<=?').run(now().toISOString())
     // Limita sesiones persistentes: hasta veinte dispositivos por propietario.
     db.prepare('DELETE FROM sessions WHERE tokenHash IN (SELECT tokenHash FROM sessions ORDER BY createdAt DESC LIMIT -1 OFFSET 19)').run()
     const token=randomBytes(32).toString('hex'),date=now(),expiresAt=new Date(date.getTime()+sessionHours*3600000).toISOString()
     db.prepare('INSERT INTO sessions VALUES (?,1,?,?)').run(digest(token),date.toISOString(),expiresAt)
     cookie(res,token,sessionHours*3600)
     return {authenticated:true,account:owner(),csrfToken:csrf(token),expiresAt}
   },
   require(req,_res,next){try{const s=session(req);if(!s)throw new HttpError(401,'Inicia sesión para acceder a tus datos.');req.auth=s;next()}catch(error){next(error)}},
   protect(req,_res,next){
     if(['GET','HEAD','OPTIONS'].includes(req.method))return next()
     if(!req.auth||!equal(req.headers['x-csrf-token'],req.auth.csrfToken))return next(new HttpError(403,'La solicitud de seguridad no es válida. Actualiza la sesión.'))
     next()
   },
   logout(req,res){const token=tokenFrom(req);if(token)db.prepare('DELETE FROM sessions WHERE tokenHash=?').run(digest(token));cookie(res,'',0)},
   async reauthenticate(req,password){
     limit('sensitive:'+digest(req.ip),5,15*60000)
     const account=db.prepare('SELECT passwordHash FROM owner WHERE id=1').get()
     if(!await verifyPassword(password,account.passwordHash))throw new HttpError(403,'No se pudo verificar la contraseña actual.')
   },
   async changePassword(req,res){
     const body=req.body
     limit('password:'+digest(req.ip),5,15*60000)
     if(!body||Object.keys(body).some(k=>!['currentPassword','newPassword'].includes(k)))throw new HttpError(400,'Datos de contraseña no válidos.')
     const account=db.prepare('SELECT * FROM owner WHERE id=1').get()
     if(!await verifyPassword(body.currentPassword,account.passwordHash))throw new HttpError(401,'No se pudo verificar la contraseña actual.')
     const hash=await hashPassword(body.newPassword)
     // Si hubo otro cambio mientras se calculaba el hash, no sobrescribirlo.
     db.exec('BEGIN IMMEDIATE')
     try{
       const changed=db.prepare('UPDATE owner SET passwordHash=?,updatedAt=? WHERE id=1 AND passwordHash=?').run(hash,now().toISOString(),account.passwordHash)
       if(!changed.changes)throw new HttpError(409,'La cuenta cambió. Inicia sesión de nuevo.')
       db.prepare('DELETE FROM sessions').run();db.exec('COMMIT')
     }catch(error){db.exec('ROLLBACK');throw error}
     cookie(res,'',0)
     return {message:'Contraseña actualizada. Todas las sesiones se cerraron; vuelve a iniciar sesión.'}
   },
 }
}
