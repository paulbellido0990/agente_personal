CREATE TABLE conversations (
 id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
) STRICT;
CREATE TABLE conversation_messages (
 id TEXT PRIMARY KEY NOT NULL, conversationId TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('user','assistant')), kind TEXT NOT NULL,
 content TEXT NOT NULL, metadata TEXT, createdAt TEXT NOT NULL
) STRICT;
CREATE INDEX messages_conversation ON conversation_messages(conversationId,createdAt);
CREATE TABLE assistant_proposals (
 id TEXT PRIMARY KEY NOT NULL, conversationId TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
 operation TEXT NOT NULL CHECK(operation IN ('create','update','status','delete')), taskId TEXT,
 payload TEXT NOT NULL, snapshot TEXT, token TEXT NOT NULL, status TEXT NOT NULL,
 expiresAt TEXT NOT NULL, result TEXT, createdAt TEXT NOT NULL
) STRICT;
CREATE INDEX proposals_conversation ON assistant_proposals(conversationId,status);
PRAGMA user_version=4;
