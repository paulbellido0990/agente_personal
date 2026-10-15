import {HttpError} from '../errors.js'
export function input(body,fields){
 if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!fields.includes(k)))throw new HttpError(400,'Campos no válidos.')
 return body
}
export function text(value,label,max=120,required=true){
 if(!required&&value==null)return ''
 if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))throw new HttpError(400,'Revisa '+label+'.')
 return value.trim()
}
export function enumeration(value,options,label){if(!options.includes(value))throw new HttpError(400,'Revisa '+label+'.');return value}
export function instant(value,optional=false){
 if(optional&&(value===null||value===''))return null
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString()!==value)throw new HttpError(400,'Indica una fecha y hora válida.')
 return value
}
export function transaction(db,action){
 const outer=db.isTransaction;if(!outer)db.exec('BEGIN IMMEDIATE')
 try{const result=action();if(!outer)db.exec('COMMIT');return result}catch(e){if(!outer)db.exec('ROLLBACK');throw e}
}
export function version(record,header){
 if(!record)throw new HttpError(404,'El registro no está disponible.')
 if(!header)throw new HttpError(428,'Falta la versión del registro.')
 if(header!=='"'+record.version+'"')throw new HttpError(409,'El registro cambió. Actualiza antes de guardar.')
}
export function requireAdmin(req,_res,next){
 if(req.auth.account.id!=='1'||req.auth.account.role!=='administrador')return next(new HttpError(403,'Solo el administrador principal puede acceder a ALIRA Control.'))
 next()
}
