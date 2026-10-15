import {useState} from 'react'
import {taskApi} from '../services/taskApi'
export default function InvitationForm({onBack}){
 const [token,setToken]=useState(''),[password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false)
 async function submit(e){
  e.preventDefault()
  if(password!==repeat){setError('Las contraseñas no coinciden.');return}
  setBusy(true);setError('')
  try{await taskApi.acceptInvitation({token:token.trim(),password});setToken('');setPassword('');setRepeat('');setDone(true)}
  catch(failure){setError(failure.message)}
  finally{setBusy(false)}
 }
 return <section><h2>Activar mi acceso</h2><p>Usa el código privado que te entregó el administrador. No hay registro público.</p>{done?<p role="status">Acceso activado. Vuelve a iniciar sesión con el nombre de usuario indicado por el administrador.</p>:<form className="task-form" onSubmit={submit}><label>Código de invitación<input required minLength={64} maxLength={64} autoComplete="off" value={token} onChange={e=>setToken(e.target.value)}/></label><label>Elige tu contraseña<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Repite tu contraseña<input required type="password" autoComplete="new-password" value={repeat} onChange={e=>setRepeat(e.target.value)}/></label>{error&&<p role="alert" className="storage-warning">{error}</p>}<button className="primary-button" disabled={busy}>{busy?'Activando…':'Activar cuenta'}</button></form>}<button className="secondary-button" disabled={busy} onClick={onBack}>Volver al inicio de sesión</button></section>
}
