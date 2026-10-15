// Restaura solo a un destino NUEVO; nunca sobrescribe la base principal.
import {DatabaseSync,backup} from 'node:sqlite'
import {existsSync} from 'node:fs'
import {mkdir,open,rm} from 'node:fs/promises'
import {resolve,dirname} from 'node:path'
import {getConfig} from '../src/config.js'
import {openDatabase} from '../src/db/database.js'
const args=process.argv.slice(2)
const value=key=>args[args.indexOf(key)+1]
if(!args.includes('--source')||!args.includes('--target'))throw new Error('Uso: npm run db:restore -- --source copia.db --target archivo-nuevo.db')
const source=resolve(value('--source')),target=resolve(value('--target')),config=getConfig()
if(target.toLowerCase()===config.dbPath.toLowerCase()||target.toLowerCase()===source.toLowerCase()||existsSync(target))throw new Error('El destino debe ser nuevo y distinto de la base principal. No se sobrescribirá ningún archivo.')
const original=new DatabaseSync(source,{readOnly:true})
let reserved=false
try{
 if(original.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('La copia no supera la comprobación de integridad.')
 original.prepare('SELECT id FROM tasks LIMIT 1').all()
 if(original.prepare('PRAGMA user_version').get().user_version>7)throw new Error('La copia pertenece a una versión posterior.')
 await mkdir(dirname(target),{recursive:true,mode:0o700})
 const handle=await open(target,'wx',0o600);await handle.close();reserved=true
 await backup(original,target)
 const restored=openDatabase(target)
 try{restored.exec('DELETE FROM sessions; DELETE FROM auth_attempts;');restored.prepare('UPDATE user_invitations SET usedAt=COALESCE(usedAt,?)').run(new Date().toISOString());if(restored.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('No se pudo verificar la restauración.')}finally{restored.close()}
 console.log('Restauración verificada en un archivo nuevo. La base principal no se modificó.')
}catch(error){if(reserved)await rm(target,{force:true});throw error}finally{original.close()}
