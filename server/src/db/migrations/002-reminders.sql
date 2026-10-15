-- Migración aditiva: las tareas previas conservan todos sus campos; recordatorios apagados.
ALTER TABLE tasks ADD COLUMN recordatorio INTEGER DEFAULT NULL CHECK(recordatorio IS NULL OR recordatorio IN (0,1,3));
CREATE TABLE reminder_events (
  id TEXT PRIMARY KEY NOT NULL,
  taskId TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  fechaLimite TEXT NOT NULL,
  daysBefore INTEGER NOT NULL CHECK(daysBefore IN (0,1,3)),
  triggerDate TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  readAt TEXT,
  notifiedAt TEXT,
  UNIQUE(taskId, fechaLimite, daysBefore)
) STRICT;
CREATE INDEX reminder_events_task ON reminder_events(taskId);
PRAGMA user_version = 2;
