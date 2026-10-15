import { useState } from 'react'
import Modal from './Modal'
export default function ImportTasksDialog({ count, onConfirm, onClose }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function confirm() {
    if (pending) return
    setPending(true)
    const ok = await onConfirm()
    setPending(false)
    if (ok) onClose()
    else setError('No se confirmó toda la importación. Cierra esta ventana para ver el detalle. Tus datos locales se conservan; los reintentos no duplican tareas.')
  }
  return <Modal title="Importar tareas locales" onClose={onClose} busy={pending} describedBy="import-description">
    <p id="import-description" className="delete-description">¿Importar {count} tareas recuperadas de este navegador a SQLite? Se conservan sus identificadores y fechas. Las existentes no se sobrescriben y la copia local no se elimina. Las tareas de demo se excluyen.</p>
    {error && <p className="storage-warning" role="alert">{error}</p>}
    <div className="modal-actions"><button className="secondary-button" disabled={pending} onClick={onClose} data-initial-focus autoFocus>Cancelar</button><button className="primary-button" disabled={pending} onClick={confirm}>{pending ? 'Importando…' : 'Confirmar importación'}</button></div>
  </Modal>
}
