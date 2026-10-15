export function createTaskRepository(db) {
  const fields = ['id','titulo','descripcion','categoria','prioridad','estado','fechaLimite','createdAt','updatedAt','recordatorio']
  const insert = db.prepare('INSERT INTO tasks (' + fields.join(',') + ') VALUES (?,?,?,?,?,?,?,?,?,?)')
  const get = db.prepare('SELECT * FROM tasks WHERE id = ?')
  const update = db.prepare('UPDATE tasks SET titulo=?, descripcion=?, categoria=?, prioridad=?, estado=?, fechaLimite=?, updatedAt=?, recordatorio=? WHERE id=?')
  return {
    get: id => get.get(id),
    list: () => db.prepare('SELECT * FROM tasks').all(),
    insert(task) { insert.run(...fields.map(field => task[field] ?? null)); return get.get(task.id) },
    update(task) { update.run(task.titulo, task.descripcion, task.categoria, task.prioridad, task.estado, task.fechaLimite, task.updatedAt, task.recordatorio ?? null, task.id); return get.get(task.id) },
    remove: id => db.prepare('DELETE FROM tasks WHERE id=?').run(id).changes,
    transaction(action) {
      db.exec('BEGIN IMMEDIATE')
      try { const result = action(); db.exec('COMMIT'); return result }
      catch (error) { db.exec('ROLLBACK'); throw error }
    },
  }
}
