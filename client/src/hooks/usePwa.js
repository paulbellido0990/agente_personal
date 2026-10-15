import {useEffect,useState} from 'react'
export default function usePwa() {
  const [prompt,setPrompt]=useState(null),[waiting,setWaiting]=useState(null)
  const [installed,setInstalled]=useState(()=>window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true)
  const [ready,setReady]=useState(false),[error,setError]=useState('')
  useEffect(()=>{
    if(!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext)return
    let active=true,registration,timer,controlled=!!navigator.serviceWorker.controller
    const onPrompt=e=>{e.preventDefault();setPrompt(e)}
    const onInstalled=()=>{setInstalled(true);setPrompt(null)}
    const onController=()=>{setWaiting(null);if(controlled)window.location.reload();else controlled=true}
    const checkWaiting=()=>{if(active)setWaiting(navigator.serviceWorker.controller && registration?.waiting ? registration.waiting : null)}
    const found=()=>{const worker=registration?.installing;if(worker)worker.addEventListener('statechange',()=>{if(worker.state==='installed')checkWaiting()})}
    window.addEventListener('beforeinstallprompt',onPrompt)
    window.addEventListener('appinstalled',onInstalled)
    navigator.serviceWorker.addEventListener('controllerchange',onController)
    navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(r=>{
      if(!active)return
      registration=r;checkWaiting();r.addEventListener('updatefound',found)
      navigator.serviceWorker.ready.then(()=>{if(active)setReady(true)})
      timer=setInterval(()=>r.update().catch(()=>{}),60*60*1000)
    }).catch(()=>{if(active)setError('No se pudo preparar el inicio sin conexión. Vuelve a cargar cuando el servidor esté disponible.')})
    return()=>{active=false;clearInterval(timer);registration?.removeEventListener('updatefound',found);window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled);navigator.serviceWorker.removeEventListener('controllerchange',onController)}
  },[])
  async function install(){
    if(!prompt)return
    try{await prompt.prompt();await prompt.userChoice}catch{setError('No se pudo abrir la instalación. Prueba desde el menú de tu navegador.')}
    finally{setPrompt(null)}
  }
  function update(){
    if(!waiting)return
    waiting.postMessage({type:'ACTIVATE_UPDATE'})
  }
  return {install,update,canInstall:!!prompt&&!installed,installed,waiting:!!waiting,ready,error}
}
