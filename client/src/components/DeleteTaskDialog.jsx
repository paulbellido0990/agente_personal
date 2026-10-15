import { useState } from 'react'
import Modal from './Modal'
export default function DeleteTaskDialog({ task, onConfirm, onClose }) {
  const [error, setError] = useState('')
  function confirm() {
    if (onConfirm(task.id)) onClose()
    else setError('No se pudo guardar la eliminación. La tarea se conserva. Revisa el almacenamiento del navegador.')
  }
  return <Modal title="¿Eliminar esta tarea?" onClose={onClose} describedBy="delete-description">
    <p id="delete-description" className="delete-description">Se eliminará «{task.titulo}». Esta acción no se puede deshacer.</p>
    {error && <p className="storage-warning" role="alert">{error}</p>}
    <div className="modal-actions">
      <button className="secondary-button" autoFocus onClick={onClose}>Conservar tarea</button>
      <button className="danger-button" onClick={confirm}>Eliminar tarea</button>
    </div>
  </Modal>
}
