import { useState } from 'react'
import Modal from './Modal'
export default function DeleteTaskDialog({ task, onConfirm, onClose }) {
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function confirm() {
    if (pending) return
    setPending(true)
    const ok = await onConfirm(task.id,task.version)
    setPending(false)
    if (ok) onClose()
    else setError('No se confirmó la eliminación. Revisa la conexión y actualiza el listado antes de reintentar.')
  }
  return <Modal title="¿Eliminar esta tarea?" onClose={onClose} busy={pending} describedBy="delete-description">
    <p id="delete-description" className="delete-description">Se eliminará «{task.titulo}». Esta acción no se puede deshacer.</p>
    {error && <p className="storage-warning" role="alert">{error}</p>}
    <div className="modal-actions">
      <button className="secondary-button" disabled={pending} data-initial-focus autoFocus onClick={onClose}>Conservar tarea</button>
      <button className="danger-button" disabled={pending} onClick={confirm}>{pending ? 'Eliminando…' : 'Eliminar tarea'}</button>
    </div>
  </Modal>
}
