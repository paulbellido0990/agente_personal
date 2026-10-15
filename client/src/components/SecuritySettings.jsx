import {useState} from 'react'
import {taskApi} from '../services/taskApi'
export default function SecuritySettings({account,onLogout,connected}){
 const [currentPassword,setCurrent]=useState(''),[newPassword,setNew]=useState(''),[repeat,setRepeat]=useState(''),[backupPassword,setBackup]=useState('')
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 async function change(e){
   e.preventDefault()
   if(newPassword!==repeat){setMessage('Las contraseñas nuevas no coinciden.');return}
   setBusy(true);setMessage('')
   try{const result=await taskApi.changePassword({currentPassword,newPassword});setMessage(result.message);setCurrent('');setNew('');setRepeat('');await onLogout(true)}catch(error){setMessage(error.message)}finally{setBusy(false)}
 }
 async function backup(e){
   e.preventDefault();setBusy(true);setMessage('')
   try{
     const blob=await taskApi.backup(backupPassword),url=URL.createObjectURL(blob),link=document.createElement('a')
     link.href=url;link.download='ALIRA-respaldo-'+new Date().toISOString().slice(0,10)+'.db';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
     setBackup('');setMessage('Respaldo descargado. Consérvalo cifrado fuera del equipo o volumen principal; contiene información privada y el hash de acceso.')
   }catch(error){setMessage(error.message)}finally{setBusy(false)}
 }
 return <section className="panel security-settings"><h2>Cuenta y seguridad</h2><p>Propietario: <strong>{account.username}</strong> · ALIRA 0.7.0</p><p>Almacenamiento: SQLite centralizada. {connected?'Backend disponible.':'Sin conexión con el backend.'}</p>
   <button className="secondary-button" disabled={busy} onClick={onLogout}>Cerrar sesión</button>
   {message&&<p className="storage-warning" role="status">{message}</p>}
   <form className="task-form" onSubmit={change}><h3>Cambiar contraseña</h3><p>Se cerrarán todas las sesiones de tus dispositivos.</p><label>Contraseña actual<input type="password" autoComplete="current-password" required maxLength={128} value={currentPassword} onChange={e=>setCurrent(e.target.value)}/></label><label>Nueva contraseña<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={e=>setNew(e.target.value)}/></label><label>Repetir nueva contraseña<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={repeat} onChange={e=>setRepeat(e.target.value)}/></label><button className="primary-button" disabled={busy||!connected}>Cambiar contraseña y cerrar sesiones</button></form>
   <form className="task-form" onSubmit={backup}><h3>Copia de seguridad</h3><p>Descarga una copia consistente de SQLite. No incluye sesiones activas. Requiere verificar de nuevo tu contraseña.</p><label>Contraseña para autorizar el respaldo<input type="password" autoComplete="current-password" required maxLength={128} value={backupPassword} onChange={e=>setBackup(e.target.value)}/></label><button className="primary-button" disabled={busy||!connected}>Descargar respaldo privado</button></form>
 </section>
}
