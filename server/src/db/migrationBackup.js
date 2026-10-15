import {DatabaseSync,backup} from 'node:sqlite'
import {existsSync} from 'node:fs'
import {mkdir,open,rm} from 'node:fs/promises'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
// Se llama antes de abrir/migrar una base real desde servidor o CLI.
// Las pruebas de openDatabase siguen usando archivos temporales.
export async function prepareMigrationBackup(path,directory){
 if(path===':memory:'||!existsSync(path))return null
 const source=new DatabaseSync(path,{readOnly:true})
 let destination,reserved=false
 try{
  const version=source.prepare('PRAGMA user_version').get().user_version
  if(version>=6||version===0)return null
  if(source.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('La base no supera la comprobación de integridad.')
  await mkdir(directory,{recursive:true,mode:0o700})
  destination=join(directory,'alira-before-v6-'+randomUUID()+'.db')
  const handle=await open(destination,'wx',0o600);await handle.close();reserved=true
  await backup(source,destination)
  const copy=new DatabaseSync(destination,{readOnly:true})
  try{
   if(copy.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('El respaldo previo no supera la comprobación de integridad.')
  }finally{copy.close()}
  return destination
 }catch(error){if(reserved)await rm(destination,{force:true});throw error}
 finally{source.close()}
}
