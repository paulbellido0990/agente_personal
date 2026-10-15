import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
export default function Modal({ title, children, onClose, describedBy, busy = false }) {
  const ref = useRef(null)
  const opener = useRef(document.activeElement)
  useEffect(() => {
    const dialog = ref.current
    const previous = opener.current
    dialog.showModal()
    dialog.querySelector('[data-initial-focus]')?.focus()
    return () => { dialog.close(); if (previous?.isConnected) previous.focus(); else document.getElementById('new-task')?.focus() }
  }, [])
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" aria-describedby={describedBy} onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <div className="modal-heading"><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label="Cerrar ventana"><X size={20} /></button></div>{children}
  </dialog>
}
