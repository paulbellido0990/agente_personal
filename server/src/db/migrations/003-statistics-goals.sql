-- Solo cambios aditivos. Nunca inferir completedAt a partir de updatedAt.
ALTER TABLE tasks ADD COLUMN completedAt TEXT DEFAULT NULL CHECK(completedAt IS NULL OR (length(completedAt)=24 AND julianday(completedAt) IS NOT NULL));
CREATE TABLE task_events (
  id TEXT PRIMARY KEY NOT NULL,
  taskId TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('created','completed')),
  occurredAt TEXT NOT NULL,
  categoria TEXT NOT NULL,
  prioridad TEXT NOT NULL,
  fechaLimite TEXT
) STRICT;
CREATE INDEX task_events_date ON task_events(kind,occurredAt);
CREATE INDEX task_events_task ON task_events(taskId,kind);
CREATE INDEX tasks_created ON tasks(createdAt);
CREATE INDEX tasks_completed ON tasks(completedAt);
-- La fecha de creación ya existe; no se generan finalizaciones históricas.
INSERT INTO task_events (id,taskId,kind,occurredAt,categoria,prioridad,fechaLimite)
SELECT 'created:'||id,id,'created',createdAt,categoria,prioridad,fechaLimite FROM tasks WHERE createdAt != '1970-01-01T00:00:00.000Z';
CREATE TABLE analytics_metadata (
  id INTEGER PRIMARY KEY CHECK(id=1),
  startedAt TEXT NOT NULL
) STRICT;
INSERT INTO analytics_metadata VALUES (1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE TABLE goals (
  id TEXT PRIMARY KEY NOT NULL,
  nombre TEXT NOT NULL CHECK(length(trim(nombre)) BETWEEN 3 AND 120),
  descripcion TEXT NOT NULL DEFAULT '' CHECK(length(descripcion)<=2000),
  fechaInicio TEXT NOT NULL,
  fechaFin TEXT NOT NULL,
  objetivo INTEGER NOT NULL CHECK(objetivo BETWEEN 1 AND 100000),
  activa INTEGER NOT NULL DEFAULT 1 CHECK(activa IN (0,1)),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  CHECK(fechaInicio<=fechaFin)
) STRICT;
PRAGMA user_version=3;
