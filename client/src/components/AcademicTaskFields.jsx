import {activityLabels,evaluationLabels} from '../../../shared/academic'
export default function AcademicTaskFields({value,onChange,courses,tasks=[]}){
 const update=(key,next)=>onChange({...value,[key]:next})
 const details=value?.detalles||{}
 const detail=(key,next)=>update('detalles',{...details,[key]:next})
 return <fieldset className="academic-task-fields"><legend>Clasificación de la tarea</legend>
  <label>Ámbito<select value={value?'academico':'personal'} onChange={e=>onChange(e.target.value==='personal'?null:{courseId:courses[0]?.id||'',tipo:'tarea',projectId:null,detalles:{}})}><option value="personal">Personal</option><option value="academico" disabled={!courses.length}>Académico</option></select></label>
  {value&&<>
   <label>Asignatura *<select required value={value.courseId} onChange={e=>onChange({...value,courseId:e.target.value,projectId:null})}><option value="">Seleccionar asignatura</option>{courses.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
   <label>Tipo de actividad<select value={value.tipo} onChange={e=>onChange({...value,tipo:e.target.value,projectId:null})}>{Object.entries(activityLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
   {value.tipo==='hito'&&<label>Proyecto *<select required value={value.projectId||''} onChange={e=>update('projectId',e.target.value)}><option value="">Seleccionar proyecto</option>{tasks.filter(t=>t.academic?.tipo==='proyecto'&&t.academic.courseId===value.courseId).map(t=><option key={t.id} value={t.id}>{t.titulo}</option>)}</select></label>}
   {['examen','practica','exposicion'].includes(value.tipo)&&<>
    <label>Tipo de evaluación<select value={details.evaluacion||''} onChange={e=>detail('evaluacion',e.target.value)}><option value="">Sin especificar</option>{Object.entries(evaluationLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <div className="form-grid"><label>Hora de evaluación<input type="time" value={details.hora||''} onChange={e=>detail('hora',e.target.value)}/></label><label>Aula de evaluación<input maxLength={120} value={details.aula||''} onChange={e=>detail('aula',e.target.value)}/></label></div>
    <label>Temas a evaluar<textarea maxLength={5000} value={details.temas||''} onChange={e=>detail('temas',e.target.value)}/></label>
   </>}
   {value.tipo==='laboratorio'&&<>
    <div className="form-grid"><label>Número de laboratorio<input maxLength={80} value={details.numero||''} onChange={e=>detail('numero',e.target.value)}/></label><label>Fecha de realización<input type="date" value={details.fechaRealizacion||''} onChange={e=>detail('fechaRealizacion',e.target.value)}/></label></div>
    <label>Enlaces a recursos (uno por línea)<textarea maxLength={1000} value={details.recursos||''} onChange={e=>detail('recursos',e.target.value)}/></label>
   </>}
   {value.tipo==='proyecto'&&<>
    <label>Fecha de inicio del proyecto<input type="date" value={details.fechaInicio||''} onChange={e=>detail('fechaInicio',e.target.value)}/></label>
    <label>Integrantes<textarea maxLength={1000} value={details.integrantes||''} onChange={e=>detail('integrantes',e.target.value)}/></label>
    <label>Repositorio<input type="url" maxLength={1000} value={details.repositorio||''} onChange={e=>detail('repositorio',e.target.value)}/></label>
    <label>Entregables<textarea maxLength={5000} value={details.entregables||''} onChange={e=>detail('entregables',e.target.value)}/></label>
   </>}
   <label>Observaciones académicas<textarea maxLength={5000} value={details.observaciones||''} onChange={e=>detail('observaciones',e.target.value)}/></label>
  </>}
 </fieldset>
}
