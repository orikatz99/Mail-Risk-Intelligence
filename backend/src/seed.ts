import fs from 'fs';
import path from 'path';
import { db } from './db';

interface MockAttachment {
  filename: string;
  extracted_text?: string;
}

interface MockEmail {
  id: string;
  from: string;
  to: string[];
  date: string;
  subject: string;
  body: string;
  attachments: MockAttachment[];
}

interface MockData {
  emails: MockEmail[];
}

function buildRawContent(email: MockEmail): string {
  const lines: string[] = [
    `From: ${email.from}`,
    `To: ${email.to.join(', ')}`,
    `Date: ${email.date}`,
    `Subject: ${email.subject}`,
    '',
    email.body,
  ];
  for (const att of email.attachments) {
    lines.push('', `--- Attachment: ${att.filename} ---`);
    if (att.extracted_text) lines.push(att.extracted_text);
  }
  return lines.join('\n');
}

export function seed(): void {
  const row = db.prepare(`SELECT count(*) as cnt FROM emails WHERE source = 'seed'`).get() as { cnt: number };
  if (row.cnt > 0) return;

  const dataPath = path.join(__dirname, '..', '..', 'mock_mailbox_data.json');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  const data = JSON.parse(raw) as MockData;

  const insert = db.prepare(
    `INSERT INTO emails (id, raw_content, status, source) VALUES (?, ?, 'pending', 'seed')`
  );

  const insertAll = db.transaction((emails: MockEmail[]) => {
    for (const email of emails) {
      insert.run(email.id, buildRawContent(email));
    }
  });

  insertAll(data.emails);
}
