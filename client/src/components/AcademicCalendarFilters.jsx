import {activityLabels} from '../../../shared/academic'
import {priorityLabels,statusLabels} from '../services/tasks'
export default function AcademicCalendarFilters({academic,filters,onChange}){
 const field=(key,label,options)=><label key={key}>{label}<select value={filters[key]} onChange={e=>onChange({...filters,[key]:e.target.value,...(key==='termId'?{courseId:''}:{})})}><option value="">Todos</option>{options.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
 return <div className="academic-filters calendar-academic-filters">
  {field('termId','Semestre del calendario',academic.terms.map(t=>[t.id,t.nombre]))}
  {field('courseId','Asignatura del calendario',academic.courses.filter(c=>!filters.termId||c.termId===filters.termId).map(c=>[c.id,c.nombre]))}
  {field('tipo','Tipo del calendario',[['personal','Personal'],['clase','Clase recurrente'],...Object.entries(activityLabels)])}
  {field('prioridad','Prioridad del calendario',Object.entries(priorityLabels))}
  {field('estado','Estado del calendario',Object.entries(statusLabels))}
 </div>
}
