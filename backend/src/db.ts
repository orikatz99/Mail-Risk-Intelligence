import Database from 'better-sqlite3';
import path from 'path';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS emails (
    id            TEXT      PRIMARY KEY,
    raw_content   TEXT      NOT NULL,
    status        TEXT      NOT NULL DEFAULT 'pending',
    error_message TEXT,
    source        TEXT      NOT NULL DEFAULT 'user',
    created_at    TIMESTAMP NOT NULL DEFAULT (datetime('now')),
    processed_at  TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS extractions (
    id         TEXT PRIMARY KEY,
    email_id   TEXT NOT NULL UNIQUE REFERENCES emails(id),
    sender     TEXT,
    recipients TEXT,
    date       TEXT,
    subject    TEXT,
    summary    TEXT,
    key_facts  TEXT
  );

  CREATE TABLE IF NOT EXISTS risk_assessments (
    id         TEXT PRIMARY KEY,
    email_id   TEXT NOT NULL UNIQUE REFERENCES emails(id),
    risk_level TEXT NOT NULL,
    rationale  TEXT NOT NULL,
    tags       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS entities (
    id               TEXT PRIMARY KEY,
    email_id         TEXT NOT NULL REFERENCES emails(id),
    type             TEXT NOT NULL,
    value            TEXT NOT NULL,
    normalized_value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS relationships (
    id                TEXT PRIMARY KEY,
    email_id          TEXT NOT NULL REFERENCES emails(id),
    source_entity_id  TEXT NOT NULL REFERENCES entities(id),
    target_entity_id  TEXT NOT NULL REFERENCES entities(id),
    relationship_type TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id             TEXT PRIMARY KEY,
    email_id       TEXT NOT NULL REFERENCES emails(id),
    filename       TEXT,
    content_type   TEXT,
    extracted_text TEXT
  );
`;

export type DbInstance = InstanceType<typeof Database>;

export function createDb(dbPath: string = path.join(process.cwd(), 'mailbox.db')): DbInstance {
  const instance = new Database(dbPath);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  instance.exec(SCHEMA);
  return instance;
}

export const db: DbInstance = createDb();
