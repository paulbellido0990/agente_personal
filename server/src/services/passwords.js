import {scrypt,randomBytes,timingSafeEqual} from 'node:crypto'
import {promisify} from 'node:util'
import {HttpError} from '../errors.js'
const derive=promisify(scrypt)
const parameters={N:131072,r:8,p:1,maxmem:256*1024*1024}
export function validatePassword(password){
 if(typeof password!=='string'||password.length<12||password.length>128)throw new HttpError(400,'La contraseña debe tener entre 12 y 128 caracteres.')
}
export async function hashPassword(password){
 validatePassword(password)
 const salt=randomBytes(16).toString('hex')
 const hash=await derive(password,salt,64,parameters)
 return ['scrypt',parameters.N,parameters.r,parameters.p,salt,hash.toString('hex')].join('$')
}
export async function verifyPassword(password,encoded){
 if(typeof password!=='string'||password.length>128)return false
 const [method,N,r,p,salt,hash]=String(encoded).split('$')
 if(method!=='scrypt'||Number(N)!==parameters.N||Number(r)!==8||Number(p)!==1||!/^[a-f0-9]{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(hash))return false
 const actual=await derive(password,salt,64,parameters)
 return timingSafeEqual(actual,Buffer.from(hash,'hex'))
}
export async function initializeOwner(db,username,password){
 if(typeof username!=='string'||!/^[a-zA-Z0-9._-]{3,80}$/.test(username))throw new HttpError(400,'Usa un nombre de 3 a 80 letras, números, puntos, guiones o guiones bajos.')
 if(db.prepare('SELECT id FROM owner').get())throw new HttpError(409,'La cuenta propietaria ya está configurada.')
 const hash=await hashPassword(password),date=new Date().toISOString()
 // La restricción id=1 y la clave primaria impiden dos propietarios aun con procesos concurrentes.
 db.prepare('INSERT INTO owner VALUES (1,?,?,?,?)').run(username,hash,date,date)
}
