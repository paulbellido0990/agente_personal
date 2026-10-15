import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto'
import {hashPassword,verifyPassword} from './passwords.js'
import {HttpError} from '../errors.js'
export const digest=value=>createHash('sha256').update(value).digest('hex')
const csrf=token=>createHmac('sha256',token).update('alira.csrf.v1').digest('hex')
const equal=(a,b)=>typeof a==='string'&&/^[a-f0-9]{64}$/.test(a)&&timingSafeEqual(Buffer.from(a),Buffer.from(b))
const publicAccount=account=>({id:account.id,username:account.username,role:account.role,status:account.status,createdAt:account.createdAt,updatedAt:account.updatedAt})
export function createAuthService(db,{production=false,sessionHours=168,now=()=>new Date()}={}){
 const cookieName=production?'__Host-alira.sid':'alira.sid'
 const principal=()=>db.prepare("SELECT * FROM users WHERE id='1' AND passwordHash IS NOT NULL").get()
 let pendingHashes=0
 function tokenFrom(req){
  const raw=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1)
  return raw&&/^[a-f0-9]{64}$/.test(raw)?raw:null
 }
 function cookie(res,token,seconds){res.setHeader('Set-Cookie',cookieName+'='+token+'; Path=/; HttpOnly; SameSite=Strict; Max-Age='+seconds+(production?'; Secure':''))}
 function session(req){
  const token=tokenFrom(req);if(!token)return null
  const row=db.prepare('SELECT * FROM sessions WHERE tokenHash=? AND expiresAt>?').get(digest(token),now().toISOString())
  if(!row)return null
  const account=db.prepare("SELECT * FROM users WHERE id=? AND status='activo'").get(row.userId)
  return account?{...row,token,csrfToken:csrf(token),account:publicAccount(account)}:null
 }
 function limit(key,max,windowMs){
  const current=now().getTime()
  db.prepare('DELETE FROM auth_attempts WHERE resetAt<=?').run(current)
  const old=db.prepare('SELECT * FROM auth_attempts WHERE key=?').get(key)
  if(old&&old.attempts>=max)throw new HttpError(429,'Demasiados intentos. Espera antes de volver a intentarlo.')
  db.prepare('INSERT INTO auth_attempts VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1').run(key,current+windowMs)
 }
 async function verify(password,hash){
  if(pendingHashes>=2)throw new HttpError(429,'Hay solicitudes de acceso en curso. Inténtalo más tarde.')
  pendingHashes++
  try{return await verifyPassword(password,hash)}finally{pendingHashes--}
 }
 return {
  cookieName,session,limit,
  info(req){const s=session(req);return {configured:!!principal(),authenticated:!!s,...(s?{account:s.account,csrfToken:s.csrfToken,expiresAt:s.expiresAt}:{})}},
  async login(req,res){
   limit('login-ip:'+digest(req.ip),5,15*60000);limit('login-global',30,15*60000)
   const body=req.body
   if(!body||Object.keys(body).some(k=>!['username','password'].includes(k))||typeof body.username!=='string'||typeof body.password!=='string'||body.username.length>80||body.password.length>128)throw new HttpError(400,'Credenciales no válidas.')
   const root=principal()
   if(!root)throw new HttpError(503,'La cuenta aún no está configurada. El propietario debe configurarla desde la terminal del servidor.')
   const account=db.prepare('SELECT * FROM users WHERE username=? COLLATE NOCASE').get(body.username)
   const valid=await verify(body.password,account?.passwordHash||root.passwordHash)
   const current=account&&db.prepare('SELECT * FROM users WHERE id=?').get(account.id)
   if(!valid||!current||current.status!=='activo'||current.passwordHash!==account.passwordHash)throw new HttpError(401,'Usuario o contraseña incorrectos.')
   db.prepare('DELETE FROM auth_attempts WHERE key=?').run('login-ip:'+digest(req.ip))
   const previous=tokenFrom(req)
   if(previous)db.prepare('DELETE FROM sessions WHERE tokenHash=?').run(digest(previous))
   db.prepare('DELETE FROM sessions WHERE expiresAt<=?').run(now().toISOString())
   db.prepare('DELETE FROM sessions WHERE tokenHash IN (SELECT tokenHash FROM sessions WHERE userId=? ORDER BY createdAt DESC LIMIT -1 OFFSET 19)').run(account.id)
   const token=randomBytes(32).toString('hex'),date=now(),expiresAt=new Date(date.getTime()+sessionHours*3600000).toISOString()
   db.prepare('INSERT INTO sessions(tokenHash,ownerId,createdAt,expiresAt,userId) VALUES (?,1,?,?,?)').run(digest(token),date.toISOString(),expiresAt,account.id)
   db.prepare('UPDATE users SET lastLoginAt=? WHERE id=?').run(date.toISOString(),account.id)
   cookie(res,token,sessionHours*3600)
   return {authenticated:true,account:publicAccount(current),csrfToken:csrf(token),expiresAt}
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
   const account=db.prepare('SELECT passwordHash FROM users WHERE id=?').get(req.auth.userId)
   if(!account||!await verify(password,account.passwordHash))throw new HttpError(403,'No se pudo verificar la contraseña actual.')
  },
  async acceptInvitation(req){
   limit('invitation:'+digest(req.ip),5,15*60000)
   const b=req.body
   if(!b||Object.keys(b).some(k=>!['token','password'].includes(k))||typeof b.token!=='string'||!/^[a-f0-9]{64}$/.test(b.token))throw new HttpError(400,'Código de invitación no válido.')
   const invitation=db.prepare('SELECT * FROM user_invitations WHERE tokenHash=? AND usedAt IS NULL AND expiresAt>?').get(digest(b.token),now().toISOString())
   if(!invitation)throw new HttpError(400,'La invitación no es válida o caducó.')
   if(pendingHashes>=2)throw new HttpError(429,'Hay solicitudes en curso.')
   pendingHashes++;let hash
   try{hash=await hashPassword(b.password)}finally{pendingHashes--}
   db.exec('BEGIN IMMEDIATE')
   try{
    const claimed=db.prepare('UPDATE user_invitations SET usedAt=? WHERE id=? AND usedAt IS NULL AND expiresAt>?').run(now().toISOString(),invitation.id,now().toISOString())
    if(!claimed.changes)throw new HttpError(409,'La invitación ya fue utilizada.')
    db.prepare("UPDATE users SET passwordHash=?,status='activo',updatedAt=? WHERE id=? AND id!='1'").run(hash,now().toISOString(),invitation.userId)
    db.prepare('DELETE FROM sessions WHERE userId=?').run(invitation.userId)
    db.exec('COMMIT')
   }catch(e){db.exec('ROLLBACK');throw e}
   return {message:'Acceso activado. Inicia sesión con el usuario indicado por el administrador.'}
  },
  async changePassword(req,res){
   const body=req.body
   limit('password:'+digest(req.ip),5,15*60000)
   if(!body||Object.keys(body).some(k=>!['currentPassword','newPassword'].includes(k)))throw new HttpError(400,'Datos de contraseña no válidos.')
   const account=db.prepare('SELECT * FROM users WHERE id=?').get(req.auth.userId)
   if(!await verify(body.currentPassword,account.passwordHash))throw new HttpError(401,'No se pudo verificar la contraseña actual.')
   const hash=await hashPassword(body.newPassword)
   db.exec('BEGIN IMMEDIATE')
   try{
    const changed=db.prepare('UPDATE users SET passwordHash=?,updatedAt=? WHERE id=? AND passwordHash=?').run(hash,now().toISOString(),account.id,account.passwordHash)
    if(!changed.changes)throw new HttpError(409,'La cuenta cambió. Inicia sesión de nuevo.')
    if(account.id==='1')db.prepare('UPDATE owner SET passwordHash=?,updatedAt=? WHERE id=1').run(hash,now().toISOString())
    db.prepare('DELETE FROM sessions WHERE userId=?').run(account.id);db.exec('COMMIT')
   }catch(error){db.exec('ROLLBACK');throw error}
   cookie(res,'',0)
   return {message:'Contraseña actualizada. Todas tus sesiones se cerraron; vuelve a iniciar sesión.'}
  }
 }
}
