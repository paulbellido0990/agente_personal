import {Download,RefreshCw,MonitorSmartphone} from 'lucide-react'
import usePwa from '../hooks/usePwa'
export default function PwaPanel({settings=false,busy=false}) {
  const pwa=usePwa()
  return <section className="pwa-panel panel" aria-label="ALIRA en tus dispositivos">
    <div className="pwa-toolbar"><span><MonitorSmartphone size={18}/>ALIRA · Gestor personal de tareas</span>
      {pwa.installed?<small>Aplicación instalada</small>:pwa.canInstall&&<button className="primary-button" onClick={pwa.install}><Download size={16}/>Instalar ALIRA</button>}
    </div>
    {pwa.waiting&&<div className="pwa-update" role="status"><p>Hay una versión nueva. Guarda tus cambios y cierra los formularios antes de actualizar. Se recargarán las pestañas abiertas de ALIRA.</p><button className="secondary-button" disabled={busy} onClick={pwa.update}><RefreshCw size={16}/>Actualizar ALIRA</button></div>}
    {pwa.error&&<p className="storage-warning" role="status">{pwa.error}</p>}
    {settings&&<><h2>Instalación y conexión</h2><p>{pwa.ready?'La interfaz está preparada para volver a abrirse sin conexión.':'La preparación offline requiere abrir la compilación de producción con conexión.'}</p><p>La instalación añade un acceso a ALIRA; no es una aplicación nativa de una tienda.</p></>}
    {!pwa.installed&&<details className="pwa-help"><summary>Cómo instalar ALIRA</summary><p>Computadora: usa la opción Instalar aplicación del menú de Chrome o Edge si está disponible. Android y tablets compatibles: busca Instalar aplicación o Añadir a pantalla de inicio. En iPhone o iPad: abre Safari, Compartir y Añadir a pantalla de inicio.</p><p>La disponibilidad depende del navegador. En desarrollo usa localhost; en celulares y tablets necesitarás una dirección HTTPS accesible desde el dispositivo.</p></details>}
    {settings&&<><h3>Datos y funcionamiento offline</h3><p>SQLite en el backend es la fuente de verdad. La caché guarda solo la interfaz, no tus tareas ni respuestas de la API. Crear, editar, completar o eliminar requiere conexión con el backend. No hay edición offline ni colas de sincronización.</p><p>La conexión se comprueba mediante consultas reales al servidor cada diez segundos y al volver a la ventana. Sin conexión, los datos que sigan visibles se identifican como desactualizados.</p><p>Los recordatorios se comprueban con ALIRA abierta. Si el backend está en una laptop apagada, los otros dispositivos no podrán acceder a los datos. El acceso remoto requiere un servidor central autorizado y HTTPS.</p></>}
  </section>
}
