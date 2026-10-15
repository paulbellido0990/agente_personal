import { useState } from 'react'
import { Pencil, Trash2, SearchX, ListTodo } from 'lucide-react'
import { statusLabels, priorityLabels, formatDate, selectTasks } from '../services/tasks'
export default function TaskTable({ tasks, query, expanded, demo, today, onEdit, onDelete, onStatus, onCreate }) {
  const [filters, setFilters] = useState({ status: '', priority: '', category: '', sort: 'fechaLimite', descending: false })
  const categories = [...new Set(tasks.map(t => t.categoria))].sort()
  const filtered = selectTasks(tasks, { ...filters, query })
  const displayed = expanded || query || filters.status || filters.priority || filters.category ? filtered : filtered.filter(t => t.estado !== 'completada')
  const update = event => setFilters({ ...filters, [event.target.name]: event.target.value })
  return <section className="panel task-panel" aria-labelledby="tasks-heading">
    <div className="panel-heading"><div><h2 id="tasks-heading">{expanded ? 'Todas las tareas' : 'Tu siguiente paso'}</h2><p>{demo ? 'Datos ficticios · cambios solo en esta sesión' : 'Un espacio para tus pendientes y tus logros.'}</p></div><span className="count-badge" role="status">{displayed.length} tareas</span></div>
    <div className="task-filters">
      <label><span className="sr-only">Filtrar por estado</span><select name="status" value={filters.status} onChange={update}><option value="">Todos los estados</option>{Object.entries(statusLabels).map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select></label>
      <label><span className="sr-only">Filtrar por prioridad</span><select name="priority" value={filters.priority} onChange={update}><option value="">Toda prioridad</option>{Object.entries(priorityLabels).map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select></label>
      <label><span className="sr-only">Filtrar por categoría</span><select name="category" value={filters.category} onChange={update}><option value="">Toda categoría</option>{[...new Set([...categories, ...(filters.category ? [filters.category] : [])])].map(c => <option key={c}>{c}</option>)}</select></label>
      <label><span className="sr-only">Ordenar tareas por</span><select name="sort" value={filters.sort} onChange={update}><option value="fechaLimite">Fecha límite</option><option value="prioridad">Prioridad</option><option value="createdAt">Fecha de creación</option></select></label>
      <button className="sort-button" onClick={() => setFilters({ ...filters, descending: !filters.descending })} aria-label={filters.descending ? 'Cambiar a orden ascendente' : 'Cambiar a orden descendente'}>{filters.descending ? 'Descendente ↓' : 'Ascendente ↑'}</button>
      <button className="secondary-button reset-filters" onClick={() => setFilters({ status: '', priority: '', category: '', sort: 'fechaLimite', descending: false })}>Restablecer filtros</button>
    </div>
    {!!displayed.length && <div className="table-scroll"><table className="live-task-table"><caption className="sr-only">{demo ? 'Tareas de demostración' : 'Tus tareas'}. Usa las acciones para editar, cambiar estado o eliminar.</caption><thead><tr><th>Tarea</th><th>Prioridad</th><th>Fecha límite</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{displayed.map(task => <tr key={task.id}>
      <td data-label="Tarea"><div className="task-name"><div><strong>{task.titulo}</strong><small>{task.categoria}</small>{task.descripcion && <p className="task-description">{task.descripcion}</p>}</div></div></td>
      <td data-label="Prioridad"><span className={'badge priority-' + task.prioridad}>{priorityLabels[task.prioridad]}</span></td>
      <td data-label="Fecha límite" className="date-cell">{formatDate(task.fechaLimite)}{task.fechaLimite && task.fechaLimite < today && task.estado !== 'completada' && <span className="overdue">Vencida</span>}</td>
      <td data-label="Estado"><select className={'task-status badge state-' + task.estado} aria-label={'Estado de ' + task.titulo} value={task.estado} onChange={event => onStatus(task.id, event.target.value)}>{Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></td>
      <td data-label="Acciones"><div className="task-actions"><button className="icon-button" onClick={() => onEdit(task)} aria-label={'Editar ' + task.titulo}><Pencil size={17} /></button><button className="icon-button delete-button" onClick={() => onDelete(task)} aria-label={'Eliminar ' + task.titulo}><Trash2 size={17} /></button></div></td>
    </tr>)}</tbody></table></div>}
    {!displayed.length && <div className="empty-state" role="status">{tasks.length ? <SearchX size={30} /> : <ListTodo size={30} />}<h3>{tasks.length ? 'No hay tareas en esta vista' : 'Tu próximo logro empieza aquí'}</h3><p>{tasks.length ? 'Revisa los filtros, la búsqueda o consulta Mis tareas para ver las completadas.' : 'Crea tu primera tarea y dale espacio a lo importante.'}</p>{!tasks.length && <button className="primary-button" onClick={onCreate}>Crear mi primera tarea</button>}</div>}
    <footer className="table-footer"><span>{demo ? 'Demo · sin almacenamiento' : 'Tareas guardadas en este navegador'}</span><span>{displayed.length} de {tasks.length} tareas</span></footer>
  </section>
}
