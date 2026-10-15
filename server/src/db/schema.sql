-- Migración inicial v1; ejecución idempotente, sin eliminar registros.
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL CHECK(length(id) BETWEEN 1 AND 120),
  titulo TEXT NOT NULL CHECK(length(trim(titulo)) BETWEEN 3 AND 120),
  descripcion TEXT NOT NULL DEFAULT '' CHECK(length(descripcion) <= 5000),
  categoria TEXT NOT NULL DEFAULT 'Sin categoría' CHECK(length(trim(categoria)) BETWEEN 1 AND 80),
  prioridad TEXT NOT NULL CHECK(prioridad IN ('alta','media','baja')),
  estado TEXT NOT NULL CHECK(estado IN ('pendiente','en_progreso','completada')),
  fechaLimite TEXT CHECK(fechaLimite IS NULL OR (
    fechaLimite GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND
    fechaLimite >= '0001-01-01' AND
    date(fechaLimite, '+0 days') IS NOT NULL AND date(fechaLimite, '+0 days') = fechaLimite
  )),
  createdAt TEXT NOT NULL CHECK(length(createdAt) = 24 AND julianday(createdAt) IS NOT NULL),
  updatedAt TEXT NOT NULL CHECK(length(updatedAt) = 24 AND julianday(updatedAt) IS NOT NULL)
) STRICT;
CREATE INDEX IF NOT EXISTS tasks_due ON tasks(fechaLimite);
CREATE INDEX IF NOT EXISTS tasks_state ON tasks(estado);
PRAGMA user_version = 1;
