import {activityLabels} from '../../../shared/academic'
import Modal from './Modal'
import { formatDate, priorityLabels, statusLabels } from '../services/tasks'
import { reminderLabels } from '../../../shared/calendar'
export default function TaskDetails({ task, onClose, onEdit, onDelete, disabled, courses=[] }) {
  return <Modal title="Detalle de tarea" onClose={onClose}><div className="task-details"><h3>{task.titulo}</h3><p className="detail-description">{task.descripcion || 'Sin descripción.'}</p><dl>
    <dt>Categoría</dt><dd>{task.categoria}</dd><dt>Prioridad</dt><dd>{priorityLabels[task.prioridad]}</dd><dt>Estado</dt><dd>{statusLabels[task.estado]}</dd><dt>Fecha límite</dt><dd>{formatDate(task.fechaLimite)}{task.fechaLimite && ' · Día completo'}</dd><dt>Recordatorio</dt><dd>{reminderLabels[task.recordatorio ?? 'off']}</dd>
    {task.academic&&<><dt>Asignatura</dt><dd>{courses.find(c=>c.id===task.academic.courseId)?.nombre||'Asignatura registrada'}</dd><dt>Actividad</dt><dd>{activityLabels[task.academic.tipo]}</dd>{Object.entries(task.academic.detalles).filter(([,value])=>value).map(([key,value])=><div key={key} className="academic-detail"><dt>{{evaluacion:'Evaluación',hora:'Hora',aula:'Aula',temas:'Temas',numero:'Laboratorio',fechaRealizacion:'Realización',fechaInicio:'Inicio',integrantes:'Integrantes',repositorio:'Repositorio',recursos:'Recursos',entregables:'Entregables',observaciones:'Observaciones'}[key]||key}</dt><dd>{value}</dd></div>)}</>}
    </dl><div className="modal-actions"><button className="secondary-button" data-initial-focus onClick={onClose}>Cerrar</button><button className="danger-button" disabled={disabled} onClick={() => onDelete(task)}>Eliminar</button><button className="primary-button" disabled={disabled} onClick={() => onEdit(task)}>Editar tarea</button></div></div></Modal>
}
