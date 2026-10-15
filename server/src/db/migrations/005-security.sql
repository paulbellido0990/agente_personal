CREATE TABLE owner (
 id INTEGER PRIMARY KEY CHECK(id=1),
 username TEXT NOT NULL UNIQUE,
 passwordHash TEXT NOT NULL,
 createdAt TEXT NOT NULL,
 updatedAt TEXT NOT NULL
) STRICT;
CREATE TABLE sessions (
 tokenHash TEXT PRIMARY KEY,
 ownerId INTEGER NOT NULL REFERENCES owner(id) ON DELETE CASCADE,
 createdAt TEXT NOT NULL,
 expiresAt TEXT NOT NULL
) STRICT;
CREATE INDEX sessions_expiry ON sessions(expiresAt);
CREATE TABLE auth_attempts (
 key TEXT PRIMARY KEY,
 attempts INTEGER NOT NULL,
 resetAt INTEGER NOT NULL
) STRICT;
ALTER TABLE tasks ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1);
ALTER TABLE goals ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1);
CREATE TRIGGER tasks_version AFTER UPDATE ON tasks WHEN NEW.version=OLD.version
BEGIN UPDATE tasks SET version=OLD.version+1 WHERE id=NEW.id; END;
CREATE TRIGGER goals_version AFTER UPDATE ON goals WHEN NEW.version=OLD.version
BEGIN UPDATE goals SET version=OLD.version+1 WHERE id=NEW.id; END;
PRAGMA user_version=5;
