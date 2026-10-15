import {useEffect,useRef,useState} from 'react'
import App from '../App'
import {taskApi} from '../services/taskApi'
import PwaPanel from './PwaPanel'
import '../styles/auth.css'
const locked=()=>{try{return !!locked()}catch{return false}}
export default function AuthGate(){
 const signedIn=useRef(false)
 const [session,setSession]=useState(null),[checking,setChecking]=useState(true),[error,setError]=useState('')
 const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[configured,setConfigured]=useState(true)
 useEffect(()=>{signedIn.current=!!session},[session])
 async function check(){
   try{
     const result=await taskApi.authSession()
     setConfigured(result.configured)
     if(result.authenticated&&!locked())setSession(result)
     else setSession(null)
     setError('')
   }catch{setSession(null);setError('No se pudo verificar la sesión. La interfaz está disponible sin conexión, pero necesitas el servidor para acceder a tus datos.')}
   finally{setChecking(false)}
 }
 useEffect(()=>{
   let active=true
   queueMicrotask(()=>{if(active)check()})
   const lost=()=>{setSession(null);setError('La sesión terminó. Vuelve a iniciar sesión.')}
   const storage=e=>{if(e.key==='alira.logout')lost()}
   window.addEventListener('alira-session-expired',lost);window.addEventListener('storage',storage)
   const timer=setInterval(async()=>{if(document.visibilityState==='visible'&&!locked()){try{const result=await taskApi.authSession();setConfigured(result.configured);if(!result.authenticated&&signedIn.current)lost()}catch{/* Un fallo de red no acredita el cierre de sesión. */}}},30000)
   const focus=async()=>{try{const result=await taskApi.authSession();setConfigured(result.configured);if(!result.authenticated&&signedIn.current)lost()}catch{/* Datos en memoria se señalan offline por useTasks. */}}
   window.addEventListener('focus',focus);window.addEventListener('online',check)
   return()=>{active=false;clearInterval(timer);window.removeEventListener('alira-session-expired',lost);window.removeEventListener('storage',storage);window.removeEventListener('focus',focus);window.removeEventListener('online',check)}
 },[])
 async function login(e){
   e.preventDefault();setBusy(true);setError('')
   try{const result=await taskApi.login({username,password});try{sessionStorage.removeItem('alira.locked')}catch{/* Almacenamiento no disponible. */}setPassword('');setSession(result)}
   catch(failure){setError(failure.message);setPassword('')}
   finally{setBusy(false)}
 }
 async function logout(revoked=false){
   setSession(null)
   try{sessionStorage.setItem('alira.locked','1');localStorage.setItem('alira.logout',String(Date.now()))}catch{/* La pantalla privada ya fue desmontada. */}
   if(revoked===true){taskApi.clearSession();setError('Contraseña actualizada. Vuelve a iniciar sesión.');return}
   try{await taskApi.logout();setError('Sesión cerrada.')}
   catch{setError('El acceso se bloqueó en este dispositivo, pero no se pudo confirmar la revocación en el servidor. Reconecta y vuelve a iniciar sesión para reemplazar esta sesión.')}
 }
 if(session)return <App account={session.account} onLogout={logout}/>
 return <main className="auth-shell"><section className="panel auth-card"><a className="brand" href="/"><img src="/alira.svg" alt=""/><span>ALIRA<small>Organiza. Avanza. Logra.</small></span></a><h1>Tu espacio para avanzar</h1><p>Accede de forma segura a tus tareas, calendario y objetivos desde tus dispositivos.</p>
  {checking?<p role="status">Verificando sesión…</p>:<>
   {error&&<p className="storage-warning" role="status">{error}</p>}
   {!configured?<p role="status">La cuenta del propietario todavía no está configurada. Créala desde una terminal privada del servidor con el comando de configuración inicial indicado en README. No existe registro público.</p>:<form className="task-form" onSubmit={login}><label>Usuario<input autoComplete="username" required maxLength={80} value={username} onChange={e=>setUsername(e.target.value)} disabled={busy}/></label><label>Contraseña<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label><button className="primary-button" disabled={busy}>{busy?'Verificando…':'Iniciar sesión'}</button></form>}
   <button className="secondary-button" disabled={busy} onClick={check}>Comprobar conexión</button>
  </>}
 </section><PwaPanel/></main>
}
