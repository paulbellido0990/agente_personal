-- Fase 9: propiedad explícita; la identidad principal conserva id='1'.
CREATE TABLE users (
 id TEXT PRIMARY KEY NOT NULL,
 username TEXT UNIQUE COLLATE NOCASE,
 passwordHash TEXT,
 role TEXT NOT NULL CHECK(role IN ('administrador','usuario')),
 status TEXT NOT NULL CHECK(status IN ('pendiente','invitado','activo','inactivo')),
 createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, lastLoginAt TEXT
) STRICT;
INSERT INTO users(id,username,passwordHash,role,status,createdAt,updatedAt)
 SELECT CAST(id AS TEXT),username,passwordHash,'administrador','activo',createdAt,updatedAt FROM owner;
INSERT OR IGNORE INTO users(id,role,status,createdAt,updatedAt)
 VALUES('1','administrador','pendiente',strftime('%Y-%m-%dT%H:%M:%fZ','now'),strftime('%Y-%m-%dT%H:%M:%fZ','now'));
-- owner se conserva como registro compatible del alta privada; users autoriza las cuentas.
CREATE TRIGGER owner_user_insert AFTER INSERT ON owner BEGIN
 UPDATE users SET username=NEW.username,passwordHash=NEW.passwordHash,status='activo',createdAt=NEW.createdAt,updatedAt=NEW.updatedAt WHERE id='1';
END;
CREATE TRIGGER owner_user_update AFTER UPDATE ON owner BEGIN
 UPDATE users SET username=NEW.username,passwordHash=NEW.passwordHash,updatedAt=NEW.updatedAt WHERE id='1';
END;
ALTER TABLE sessions ADD COLUMN userId TEXT NOT NULL DEFAULT '1' REFERENCES users(id);
CREATE INDEX sessions_user ON sessions(userId);
UPDATE users SET lastLoginAt=(SELECT max(createdAt) FROM sessions WHERE sessions.userId=users.id);
ALTER TABLE tasks ADD COLUMN userId TEXT NOT NULL DEFAULT '1' REFERENCES users(id);
ALTER TABLE goals ADD COLUMN userId TEXT NOT NULL DEFAULT '1' REFERENCES users(id);
ALTER TABLE task_events ADD COLUMN userId TEXT NOT NULL DEFAULT '1' REFERENCES users(id);
ALTER TABLE academic_terms ADD COLUMN userId TEXT NOT NULL DEFAULT '1' REFERENCES users(id);
ALTER TABLE courses ADD COLUMN userId TEXT NOT NULL DEFAULT '1' REFERENCES users(id);
ALTER TABLE class_sessions ADD COLUMN userId TEXT NOT NULL DEFAULT '1' REFERENCES users(id);
ALTER TABLE task_academic ADD COLUMN userId TEXT NOT NULL DEFAULT '1' REFERENCES users(id);
ALTER TABLE reminder_events ADD COLUMN userId TEXT NOT NULL DEFAULT '1' REFERENCES users(id);
ALTER TABLE reminder_events_legacy_v5 ADD COLUMN userId TEXT NOT NULL DEFAULT '1' REFERENCES users(id);
ALTER TABLE conversations ADD COLUMN userId TEXT NOT NULL DEFAULT '1' REFERENCES users(id);
ALTER TABLE conversation_messages ADD COLUMN userId TEXT NOT NULL DEFAULT '1' REFERENCES users(id);
ALTER TABLE assistant_proposals ADD COLUMN userId TEXT NOT NULL DEFAULT '1' REFERENCES users(id);
DROP INDEX academic_one_active;
CREATE UNIQUE INDEX academic_one_active_user ON academic_terms(userId) WHERE estado='activo';
CREATE TABLE user_analytics(userId TEXT PRIMARY KEY REFERENCES users(id),startedAt TEXT NOT NULL) STRICT;
INSERT INTO user_analytics SELECT '1',startedAt FROM analytics_metadata WHERE id=1;
CREATE TABLE teachers(
 id TEXT PRIMARY KEY, userId TEXT NOT NULL DEFAULT '1' REFERENCES users(id),
 nombre TEXT NOT NULL, nombreKey TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
 notas TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1,
 createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, UNIQUE(userId,nombreKey)
) STRICT;
ALTER TABLE class_sessions ADD COLUMN teacherId TEXT REFERENCES teachers(id);
CREATE TABLE user_invitations(
 id TEXT PRIMARY KEY, userId TEXT NOT NULL REFERENCES users(id), tokenHash TEXT NOT NULL UNIQUE,
 kind TEXT NOT NULL CHECK(kind IN ('invitacion','recuperacion')), createdAt TEXT NOT NULL,
 expiresAt TEXT NOT NULL, usedAt TEXT
) STRICT;
CREATE TABLE announcements(
 id TEXT PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL,
 importance TEXT NOT NULL CHECK(importance IN ('normal','importante','urgente')),
 pinned INTEGER NOT NULL DEFAULT 0 CHECK(pinned IN (0,1)),
 published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
 audience TEXT NOT NULL CHECK(audience IN ('todos','usuarios','seleccionados')),
 publishAt TEXT NOT NULL, expiresAt TEXT, version INTEGER NOT NULL DEFAULT 1,
 createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
) STRICT;
CREATE TABLE announcement_recipients(
 announcementId TEXT NOT NULL REFERENCES announcements(id),userId TEXT NOT NULL REFERENCES users(id),
 readAt TEXT,selected INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(announcementId,userId)
) STRICT;
CREATE TABLE message_threads(
 id TEXT PRIMARY KEY,userId TEXT NOT NULL REFERENCES users(id),
 subject TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('mensaje','soporte')),
 createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL
) STRICT;
CREATE TABLE messages(
 id TEXT PRIMARY KEY,threadId TEXT NOT NULL REFERENCES message_threads(id),
 authorId TEXT NOT NULL REFERENCES users(id),body TEXT NOT NULL,createdAt TEXT NOT NULL
) STRICT;
CREATE TABLE message_reads(
 threadId TEXT NOT NULL REFERENCES message_threads(id),userId TEXT NOT NULL REFERENCES users(id),
 lastReadAt TEXT NOT NULL,lastSequence INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(threadId,userId)
) STRICT;
CREATE TABLE support_tickets(
 threadId TEXT PRIMARY KEY REFERENCES message_threads(id),
 type TEXT NOT NULL CHECK(type IN ('error','acceso','sugerencia','consulta')),
 status TEXT NOT NULL CHECK(status IN ('abierta','revision','resuelta','cerrada')),
 version INTEGER NOT NULL DEFAULT 1
) STRICT;
CREATE TABLE admin_audit_log(
 id TEXT PRIMARY KEY,actorId TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,
 subjectId TEXT,createdAt TEXT NOT NULL
) STRICT;
CREATE TRIGGER audit_no_update BEFORE UPDATE ON admin_audit_log BEGIN SELECT RAISE(ABORT,'Auditoría inmutable');END;
CREATE TRIGGER audit_no_delete BEFORE DELETE ON admin_audit_log BEGIN SELECT RAISE(ABORT,'Auditoría inmutable');END;
CREATE TABLE resource_shares(
 id TEXT PRIMARY KEY,ownerId TEXT NOT NULL REFERENCES users(id),recipientId TEXT NOT NULL REFERENCES users(id),
 kind TEXT NOT NULL CHECK(kind IN ('curso','horario','proyecto')),resourceId TEXT NOT NULL,
 createdAt TEXT NOT NULL,revokedAt TEXT,UNIQUE(ownerId,recipientId,kind,resourceId),CHECK(ownerId!=recipientId)
) STRICT;
CREATE TABLE platform_settings(
 id INTEGER PRIMARY KEY CHECK(id=1),name TEXT NOT NULL,notice TEXT NOT NULL DEFAULT '',
 version INTEGER NOT NULL DEFAULT 1,updatedAt TEXT NOT NULL
) STRICT;
INSERT INTO platform_settings VALUES(1,'ALIRA','',1,strftime('%Y-%m-%dT%H:%M:%fZ','now'));
CREATE INDEX tasks_user ON tasks(userId);
CREATE INDEX events_user ON task_events(userId,occurredAt);
CREATE INDEX goals_user ON goals(userId);
CREATE INDEX academic_user ON academic_terms(userId);
CREATE INDEX courses_user ON courses(userId);
CREATE INDEX sessions_class_user ON class_sessions(userId);
CREATE INDEX reminders_user ON reminder_events(userId);
CREATE INDEX messages_thread ON messages(threadId,createdAt);
PRAGMA user_version=7;

-- Defensa adicional: las relaciones no pueden cruzar propietarios.
CREATE TRIGGER course_owner_insert BEFORE INSERT ON courses WHEN NOT EXISTS(SELECT 1 FROM academic_terms WHERE id=NEW.termId AND userId=NEW.userId) BEGIN SELECT RAISE(ABORT,'Relación privada inválida');END;
CREATE TRIGGER course_owner_update BEFORE UPDATE ON courses WHEN NOT EXISTS(SELECT 1 FROM academic_terms WHERE id=NEW.termId AND userId=NEW.userId) BEGIN SELECT RAISE(ABORT,'Relación privada inválida');END;
CREATE TRIGGER class_owner_insert BEFORE INSERT ON class_sessions WHEN NOT EXISTS(SELECT 1 FROM courses WHERE id=NEW.courseId AND userId=NEW.userId) OR (NEW.teacherId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM teachers WHERE id=NEW.teacherId AND userId=NEW.userId)) BEGIN SELECT RAISE(ABORT,'Relación privada inválida');END;
CREATE TRIGGER class_owner_update BEFORE UPDATE ON class_sessions WHEN NOT EXISTS(SELECT 1 FROM courses WHERE id=NEW.courseId AND userId=NEW.userId) OR (NEW.teacherId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM teachers WHERE id=NEW.teacherId AND userId=NEW.userId)) BEGIN SELECT RAISE(ABORT,'Relación privada inválida');END;
CREATE TRIGGER academic_owner_insert BEFORE INSERT ON task_academic WHEN NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.taskId AND userId=NEW.userId) OR NOT EXISTS(SELECT 1 FROM courses WHERE id=NEW.courseId AND userId=NEW.userId) OR (NEW.projectId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.projectId AND userId=NEW.userId)) BEGIN SELECT RAISE(ABORT,'Relación privada inválida');END;
CREATE TRIGGER academic_owner_update BEFORE UPDATE ON task_academic WHEN NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.taskId AND userId=NEW.userId) OR NOT EXISTS(SELECT 1 FROM courses WHERE id=NEW.courseId AND userId=NEW.userId) OR (NEW.projectId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.projectId AND userId=NEW.userId)) BEGIN SELECT RAISE(ABORT,'Relación privada inválida');END;
CREATE TRIGGER reminder_owner_insert BEFORE INSERT ON reminder_events WHEN (NEW.taskId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM tasks WHERE id=NEW.taskId AND userId=NEW.userId)) OR (NEW.sessionId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM class_sessions WHERE id=NEW.sessionId AND userId=NEW.userId)) BEGIN SELECT RAISE(ABORT,'Relación privada inválida');END;

CREATE TRIGGER immutable_tasks_owner BEFORE UPDATE OF userId ON tasks WHEN NEW.userId!=OLD.userId BEGIN SELECT RAISE(ABORT,'El propietario no puede cambiar');END;

CREATE TRIGGER immutable_goals_owner BEFORE UPDATE OF userId ON goals WHEN NEW.userId!=OLD.userId BEGIN SELECT RAISE(ABORT,'El propietario no puede cambiar');END;

CREATE TRIGGER immutable_task_events_owner BEFORE UPDATE OF userId ON task_events WHEN NEW.userId!=OLD.userId BEGIN SELECT RAISE(ABORT,'El propietario no puede cambiar');END;

CREATE TRIGGER immutable_academic_terms_owner BEFORE UPDATE OF userId ON academic_terms WHEN NEW.userId!=OLD.userId BEGIN SELECT RAISE(ABORT,'El propietario no puede cambiar');END;

CREATE TRIGGER immutable_courses_owner BEFORE UPDATE OF userId ON courses WHEN NEW.userId!=OLD.userId BEGIN SELECT RAISE(ABORT,'El propietario no puede cambiar');END;

CREATE TRIGGER immutable_class_sessions_owner BEFORE UPDATE OF userId ON class_sessions WHEN NEW.userId!=OLD.userId BEGIN SELECT RAISE(ABORT,'El propietario no puede cambiar');END;

CREATE TRIGGER immutable_task_academic_owner BEFORE UPDATE OF userId ON task_academic WHEN NEW.userId!=OLD.userId BEGIN SELECT RAISE(ABORT,'El propietario no puede cambiar');END;

CREATE TRIGGER immutable_reminder_events_owner BEFORE UPDATE OF userId ON reminder_events WHEN NEW.userId!=OLD.userId BEGIN SELECT RAISE(ABORT,'El propietario no puede cambiar');END;

CREATE TRIGGER immutable_teachers_owner BEFORE UPDATE OF userId ON teachers WHEN NEW.userId!=OLD.userId BEGIN SELECT RAISE(ABORT,'El propietario no puede cambiar');END;
