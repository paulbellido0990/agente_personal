import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
export default function Modal({ title, children, onClose, describedBy }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const previous = document.activeElement
    dialog.showModal()
    return () => { dialog.close(); if (previous?.isConnected) previous.focus(); else document.getElementById('new-task')?.focus() }
  }, [])
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" aria-describedby={describedBy} onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="modal-heading"><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Cerrar ventana"><X size={20} /></button></div>{children}
  </dialog>
}
