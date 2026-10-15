import Modal from './Modal'
import { formatDate, priorityLabels, statusLabels } from '../services/tasks'
import { reminderLabels } from '../../../shared/calendar'
export default function TaskDetails({ task, onClose, onEdit, onDelete, disabled }) {
  return <Modal title="Detalle de tarea" onClose={onClose}><div className="task-details"><h3>{task.titulo}</h3><p className="detail-description">{task.descripcion || 'Sin descripción.'}</p><dl>
    <dt>Categoría</dt><dd>{task.categoria}</dd><dt>Prioridad</dt><dd>{priorityLabels[task.prioridad]}</dd><dt>Estado</dt><dd>{statusLabels[task.estado]}</dd><dt>Fecha límite</dt><dd>{formatDate(task.fechaLimite)}{task.fechaLimite && ' · Día completo'}</dd><dt>Recordatorio</dt><dd>{reminderLabels[task.recordatorio ?? 'off']}</dd>
    </dl><div className="modal-actions"><button className="secondary-button" data-initial-focus onClick={onClose}>Cerrar</button><button className="danger-button" disabled={disabled} onClick={() => onDelete(task)}>Eliminar</button><button className="primary-button" disabled={disabled} onClick={() => onEdit(task)}>Editar tarea</button></div></div></Modal>
}
