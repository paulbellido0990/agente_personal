import {fileURLToPath} from 'node:url'
import {resolve,dirname,sep,isAbsolute} from 'node:path'
const root=fileURLToPath(new URL('../',import.meta.url))
export function getConfig(env=process.env){
 const production=env.NODE_ENV==='production'
 const port=Number(env.PORT||3001),origin=env.FRONTEND_ORIGIN||'http://localhost:5173'
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT debe ser válido.')
 if(new URL(origin).origin!==origin||!/^https?:/.test(origin))throw new Error('FRONTEND_ORIGIN debe ser un origen HTTP/HTTPS sin ruta.')
 if(production&&!origin.startsWith('https://'))throw new Error('Producción requiere FRONTEND_ORIGIN con HTTPS.')
 if(production&&(!env.DB_PATH||!isAbsolute(env.DB_PATH)||!env.BACKUP_DIR||!isAbsolute(env.BACKUP_DIR)))throw new Error('Producción requiere DB_PATH y BACKUP_DIR absolutos en almacenamiento persistente.')
 const sessionHours=Number(env.SESSION_HOURS||168)
 if(!Number.isInteger(sessionHours)||sessionHours<1||sessionHours>720)throw new Error('SESSION_HOURS debe estar entre 1 y 720.')
 const trustProxy=env.TRUST_PROXY||''
 if(trustProxy&&!['loopback','linklocal','uniquelocal'].includes(trustProxy)&&!trustProxy.split(',').every(s=>/^[0-9a-fA-F.:/]+$/.test(s.trim())))throw new Error('TRUST_PROXY debe indicar las redes explícitas del proxy; no uses true ni saltos arbitrarios.')
 if(production&&!trustProxy)throw new Error('Define TRUST_PROXY con las redes del proxy HTTPS autorizado.')
 const dbPath=resolve(root,env.DB_PATH||'./data/alira.db'),backupDir=resolve(root,env.BACKUP_DIR||'./backups')
 if(backupDir===dirname(dbPath)||backupDir.startsWith(dirname(dbPath)+sep))throw new Error('BACKUP_DIR debe estar fuera del directorio principal de datos.')
 const backupIntervalHours=Number(env.BACKUP_INTERVAL_HOURS||(production?24:0))
 if(!Number.isFinite(backupIntervalHours)||backupIntervalHours<0||backupIntervalHours>720)throw new Error('Intervalo de respaldo no válido.')
 return {host:env.HOST||'127.0.0.1',port,origin,dbPath,production,sessionHours,trustProxy:trustProxy||false,backupDir,backupIntervalHours,staticDir:production?resolve(root,'../client/dist'):null}
}
