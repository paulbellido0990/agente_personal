import {backup,DatabaseSync} from 'node:sqlite'
import {mkdtemp,mkdir,chmod,rename,rm,open} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join,resolve,sep} from 'node:path'
import {randomUUID} from 'node:crypto'
export async function createBackup(db,directory){
 await mkdir(directory,{recursive:true,mode:0o700})
 const name='alira-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID()+'.db'
 const partial=join(directory,'.'+name+'.partial'),destination=join(directory,name)
 try{
   const reserved=await open(partial,'wx',0o600);await reserved.close()
   await backup(db,partial)
   await chmod(partial,0o600)
   const copy=new DatabaseSync(partial)
   try{if(copy.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('La copia no superó la verificación de integridad.');copy.prepare('DELETE FROM sessions').run();copy.prepare('DELETE FROM auth_attempts').run();if(copy.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='user_invitations'").get())copy.prepare('UPDATE user_invitations SET usedAt=COALESCE(usedAt,?)').run(new Date().toISOString())}finally{copy.close()}
   await rename(partial,destination)
   return {name,path:destination}
 }catch(error){await rm(partial,{force:true});throw error}
}
export async function downloadableBackup(db){
 const root=await mkdtemp(join(tmpdir(),'alira-backup-'))
 try{
   const result=await createBackup(db,root)
   return {...result,cleanup:async()=>{
     const absolute=resolve(root)
     if(!absolute.startsWith(resolve(tmpdir())+sep)||!absolute.includes('alira-backup-'))throw new Error('Ruta temporal no válida.')
     await rm(absolute,{recursive:true,force:true})
   }}
 }catch(error){if(!resolve(root).startsWith(resolve(tmpdir())+sep)||!root.includes('alira-backup-'))throw new Error('Ruta temporal no válida.');await rm(root,{recursive:true,force:true});throw error}
}
