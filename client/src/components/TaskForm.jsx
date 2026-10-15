import { useRef, useState } from 'react'
import Modal from './Modal'
import { statusLabels, priorityLabels, validateTask } from '../services/tasks'
export default function TaskForm({ task, categories, onSave, onClose }) {
  const [values, setValues] = useState(() => task ? { ...task, fechaLimite: task.fechaLimite || '' } : { titulo: '', descripcion: '', categoria: '', prioridad: 'media', estado: 'pendiente', fechaLimite: '' })
  const [errors, setErrors] = useState({})
  const [saveError, setSaveError] = useState('')
  const [pending, setPending] = useState(false)
  const [requestId] = useState(() => crypto.randomUUID())
  const formRef = useRef(null)
  function update(event) { setValues({ ...values, [event.target.name]: event.target.value }) }
  async function submit(event) {
    event.preventDefault()
    if (pending) return
    const found = validateTask(values)
    if (formRef.current.elements.namedItem('fechaLimite').validity.badInput) found.fechaLimite = 'Completa una fecha válida o deja el campo vacío.'
    setErrors(found)
    setSaveError('')
    if (Object.keys(found).length) { formRef.current.elements.namedItem(Object.keys(found)[0])?.focus(); return }
    setPending(true)
    const ok = await onSave(values, task?.id, requestId)
    setPending(false)
    if (ok) onClose()
    else setSaveError('No se confirmó el guardado. Revisa el backend y la conexión. Conservamos los campos; cierra esta ventana para actualizar el listado antes de reintentar.')
  }
  const field = name => ({ name, id: name, value: values[name], onChange: update, 'aria-invalid': !!errors[name], 'aria-describedby': errors[name] ? name + '-error' : undefined })
  const error = name => errors[name] && <small className="field-error" id={name + '-error'}>{errors[name]}</small>
  return <Modal title={task ? 'Editar tarea' : 'Un nuevo paso hacia tu meta'} onClose={onClose} busy={pending}><form ref={formRef} onSubmit={submit} noValidate className="task-form">
    <fieldset className="form-fields" disabled={pending}>
    <p className="form-intro">Los campos con * son obligatorios.</p>
    <label htmlFor="titulo">Título *<input {...field('titulo')} required minLength={3} maxLength={120} data-initial-focus autoFocus placeholder="¿Qué quieres lograr?" />{error('titulo')}</label>
    <label htmlFor="descripcion">Descripción<textarea {...field('descripcion')} maxLength={5000} rows={3} placeholder="Añade los detalles que necesitas recordar" />{error('descripcion')}</label>
    <label htmlFor="categoria">Categoría<input {...field('categoria')} list="task-categories" maxLength={80} placeholder="Sin categoría" /><datalist id="task-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>{error('categoria')}</label>
    <div className="form-grid"><label htmlFor="prioridad">Prioridad *<select {...field('prioridad')}>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{error('prioridad')}</label>
    <label htmlFor="estado">Estado *<select {...field('estado')}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{error('estado')}</label></div>
    <div className="date-field"><label htmlFor="fechaLimite">Fecha límite</label><input {...field('fechaLimite')} aria-describedby={errors.fechaLimite ? 'fechaLimite-error date-help' : 'date-help'} type="date" min="0001-01-01" max="9999-12-31" />{error('fechaLimite')}<small className="muted" id="date-help">Opcional. Se interpreta como fecha local en Lima. Se permiten fechas pasadas.</small></div>
    {saveError && <p className="storage-warning" role="alert">{saveError}</p>}
    <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" type="submit">{pending ? 'Guardando…' : task ? 'Guardar cambios' : 'Crear tarea'}</button></div>
  </fieldset></form></Modal>
}
