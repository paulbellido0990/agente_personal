import {randomUUID} from 'node:crypto'
import {tenant} from './tenant.js'
import {HttpError} from '../errors.js'
import {input,text} from './platformValidation.js'
export function createTeacherService(db,userId='1',now=()=>new Date()){
 const own=tenant(db,userId)
 return {
  list:()=>own.list('teachers').sort((a,b)=>a.nombre.localeCompare(b.nombre)),
  save(body,id){
   input(body,['nombre','email','notas'])
   if(id&&!own.get('teachers',id))throw new HttpError(404,'No se encontró el docente.')
   const nombre=text(body.nombre,'nombre'),key=nombre.normalize('NFKC').toLocaleLowerCase('es-PE'),email=text(body.email,'correo',254,false),notas=text(body.notas,'notas',2000,false)
   if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError(400,'Correo no válido.')
   const duplicate=db.prepare('SELECT id FROM teachers WHERE userId=? AND nombreKey=?').get(userId,key)
   if(duplicate&&duplicate.id!==id)throw new HttpError(409,'Ya tienes un docente con ese nombre.')
   const stamp=now().toISOString()
   if(id)db.prepare('UPDATE teachers SET nombre=?,nombreKey=?,email=?,notas=?,updatedAt=?,version=version+1 WHERE id=? AND userId=?').run(nombre,key,email,notas,stamp,id,userId)
   else{id=randomUUID();db.prepare('INSERT INTO teachers(id,userId,nombre,nombreKey,email,notas,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?)').run(id,userId,nombre,key,email,notas,stamp,stamp)}
   return own.get('teachers',id)
  },
  remove(id){
   if(!own.get('teachers',id))throw new HttpError(404,'No se encontró el docente.')
   if(db.prepare('SELECT 1 FROM class_sessions WHERE teacherId=? AND userId=?').get(id,userId))throw new HttpError(409,'Este docente tiene sesiones. Reasigna las sesiones antes de eliminarlo.')
   own.remove('teachers',id)
  }
 }
}
