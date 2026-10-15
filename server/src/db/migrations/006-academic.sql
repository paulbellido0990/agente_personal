-- Extensión académica. Los registros existentes no cambian.
CREATE TABLE academic_terms (
 id TEXT PRIMARY KEY NOT NULL,
 nombre TEXT NOT NULL CHECK(length(trim(nombre)) BETWEEN 1 AND 120),
 fechaInicio TEXT NOT NULL, fechaFin TEXT NOT NULL,
 estado TEXT NOT NULL CHECK(estado IN ('activo','inactivo','archivado')),
 version INTEGER NOT NULL DEFAULT 1,
 createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
 CHECK(fechaInicio<=fechaFin)
) STRICT;
CREATE UNIQUE INDEX academic_one_active ON academic_terms(estado) WHERE estado='activo';
CREATE TABLE courses (
 id TEXT PRIMARY KEY NOT NULL,
 termId TEXT NOT NULL REFERENCES academic_terms(id),
 nombre TEXT NOT NULL CHECK(length(trim(nombre)) BETWEEN 1 AND 120),
 codigo TEXT NOT NULL DEFAULT '', docentes TEXT NOT NULL DEFAULT '',
 creditos REAL, color TEXT NOT NULL, descripcion TEXT NOT NULL DEFAULT '',
 estado TEXT NOT NULL CHECK(estado IN ('activa','finalizada','archivada')),
 version INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
) STRICT;
CREATE INDEX courses_term ON courses(termId);
CREATE TABLE class_sessions (
 id TEXT PRIMARY KEY NOT NULL, courseId TEXT NOT NULL REFERENCES courses(id),
 dia INTEGER NOT NULL CHECK(dia BETWEEN 1 AND 7),
 horaInicio TEXT NOT NULL, horaFin TEXT NOT NULL,
 tipo TEXT NOT NULL CHECK(tipo IN ('teoria','laboratorio','otra')),
 aula TEXT NOT NULL DEFAULT '', docente TEXT NOT NULL DEFAULT '', observaciones TEXT NOT NULL DEFAULT '',
 fechaInicio TEXT NOT NULL, fechaFin TEXT NOT NULL,
 recordatorio INTEGER CHECK(recordatorio IS NULL OR recordatorio IN (0,1,3)),
 version INTEGER NOT NULL DEFAULT 1, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
 CHECK(horaInicio<horaFin AND fechaInicio<=fechaFin)
) STRICT;
CREATE INDEX class_course ON class_sessions(courseId);
CREATE TABLE task_academic (
 taskId TEXT PRIMARY KEY NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
 courseId TEXT NOT NULL REFERENCES courses(id),
 tipo TEXT NOT NULL CHECK(tipo IN ('teoria','laboratorio','practica','tarea','grupal','exposicion','examen','proyecto','hito','otros')),
 projectId TEXT REFERENCES tasks(id) ON DELETE RESTRICT,
 detalles TEXT NOT NULL DEFAULT '{}',
 CHECK(projectId IS NULL OR projectId != taskId)
) STRICT;
CREATE INDEX academic_course ON task_academic(courseId);
CREATE INDEX academic_project ON task_academic(projectId);
-- Conservamos íntegra la tabla anterior como archivo de compatibilidad.
-- La única tabla activa de avisos admite tareas y ocurrencias de clases.
ALTER TABLE reminder_events RENAME TO reminder_events_legacy_v5;
CREATE TABLE reminder_events (
 id TEXT PRIMARY KEY NOT NULL,
 taskId TEXT REFERENCES tasks(id) ON DELETE CASCADE,
 sessionId TEXT REFERENCES class_sessions(id) ON DELETE CASCADE,
 fechaLimite TEXT NOT NULL,
 daysBefore INTEGER NOT NULL CHECK(daysBefore IN (0,1,3)),
 triggerDate TEXT NOT NULL, createdAt TEXT NOT NULL, readAt TEXT, notifiedAt TEXT,
 CHECK((taskId IS NOT NULL AND sessionId IS NULL) OR (taskId IS NULL AND sessionId IS NOT NULL)),
 UNIQUE(taskId,fechaLimite,daysBefore), UNIQUE(sessionId,fechaLimite,daysBefore)
) STRICT;
INSERT INTO reminder_events(id,taskId,fechaLimite,daysBefore,triggerDate,createdAt,readAt,notifiedAt)
 SELECT id,taskId,fechaLimite,daysBefore,triggerDate,createdAt,readAt,notifiedAt FROM reminder_events_legacy_v5;
CREATE INDEX reminder_v6_task ON reminder_events(taskId);
CREATE INDEX reminder_v6_session ON reminder_events(sessionId);
PRAGMA user_version=6;
