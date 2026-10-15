import { useState } from 'react'
import Modal from './Modal'
export default function GoalForm({goal,today,onSave,onClose}) {
  const [values,setValues]=useState(()=>goal?{nombre:goal.nombre,descripcion:goal.descripcion,fechaInicio:goal.fechaInicio,fechaFin:goal.fechaFin,objetivo:goal.objetivo,activa:goal.activa}:{nombre:'',descripcion:'',fechaInicio:today,fechaFin:today,objetivo:5,activa:true})
  const [pending,setPending]=useState(false),[error,setError]=useState('')
  const update=e=>setValues({...values,[e.target.name]:e.target.value})
  async function submit(event){
    event.preventDefault()
    if(values.nombre.trim().length<3||!Number.isInteger(Number(values.objetivo))||Number(values.objetivo)<1||values.fechaInicio>values.fechaFin){setError('Revisa el nombre, el periodo y la cantidad objetivo.');return}
    setPending(true);setError('')
    try{await onSave({...values,objetivo:Number(values.objetivo)},goal?.id);onClose()}catch(failure){setError(failure.message)}finally{setPending(false)}
  }
  return <Modal title={goal?'Editar meta':'Nueva meta personal'} onClose={onClose} busy={pending}><form className="task-form" onSubmit={submit}><fieldset disabled={pending} className="form-fields">
    <label>Nombre de la meta<input name="nombre" value={values.nombre} onChange={update} required minLength={3} maxLength={120} data-initial-focus/></label>
    <label>Descripción de la meta<textarea name="descripcion" value={values.descripcion} onChange={update} maxLength={2000} rows={3}/></label>
    <div className="form-grid"><label>Inicio del objetivo<input type="date" name="fechaInicio" value={values.fechaInicio} onChange={update} required/></label><label>Fin del objetivo<input type="date" name="fechaFin" value={values.fechaFin} onChange={update} required/></label></div>
    <label>Cantidad objetivo<input type="number" name="objetivo" value={values.objetivo} onChange={update} min={1} max={100000} step={1} required/></label>
    <label>Estado de la meta<select value={values.activa?'active':'inactive'} onChange={e=>setValues({...values,activa:e.target.value==='active'})}><option value="active">Activa</option><option value="inactive">Desactivada</option></select></label>
    <p className="calendar-subtitle">Se cuentan tareas distintas con finalización registrada durante este periodo; reabrir una tarea no borra su actividad anterior.</p>
    {error&&<p className="storage-warning" role="alert">{error}</p>}
    <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button">{pending?'Guardando…':goal?'Guardar meta':'Crear meta'}</button></div>
  </fieldset></form></Modal>
}
