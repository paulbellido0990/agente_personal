import {getConfig} from './config.js'
import {openDatabase} from './db/database.js'
import {createApp} from './app.js'
import {createBackup} from './services/backupService.js'
let db
try{
 const config=getConfig();db=openDatabase(config.dbPath)
 if(!db.prepare('SELECT id FROM owner').get())console.log('Propietario pendiente: todos los datos están bloqueados. Configúralo desde una terminal privada.')
 const server=createApp({db,...config}).listen(config.port,config.host,()=>console.log('ALIRA iniciada en '+config.host+':'+config.port))
 let backingUp=false,timer
 const runBackup=async()=>{
   if(backingUp)return
   backingUp=true
   try{await createBackup(db,config.backupDir);console.log('Respaldo periódico completado.')}catch{console.error('No se pudo generar el respaldo periódico.')}finally{backingUp=false}
 }
 if(config.backupIntervalHours){runBackup();timer=setInterval(runBackup,config.backupIntervalHours*3600000)}
 server.requestTimeout=30000;server.headersTimeout=10000
 server.on('error',error=>{console.error('No se pudo iniciar ALIRA:',error.code||error.name);clearInterval(timer);db.close();process.exitCode=1})
 let stopping=false
 const stop=()=>{if(stopping)return;stopping=true;clearInterval(timer);server.close(async()=>{while(backingUp)await new Promise(r=>setTimeout(r,50));db.close();process.exit(0)});server.closeIdleConnections();setTimeout(()=>process.exit(1),30000).unref()}
 process.on('SIGINT',stop);process.on('SIGTERM',stop)
}catch{db?.close();console.error('No se pudo iniciar ALIRA. Revisa configuración, propietario, volumen y permisos.');process.exitCode=1}
