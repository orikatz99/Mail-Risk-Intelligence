import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { queueEmail } from '../services/pipeline';
import { validateFile } from '../services/ingestion/validator';
import { extractText } from '../services/ingestion/parser';
import type { Email } from '../models/types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', (_req, res) => {
  const rows = db.prepare(`
    SELECT e.id, e.status, e.created_at, ex.sender, ex.subject, ex.date, ra.risk_level
    FROM emails e
    LEFT JOIN extractions ex ON ex.email_id = e.id
    LEFT JOIN risk_assessments ra ON ra.email_id = e.id
    ORDER BY
      CASE ra.risk_level
        WHEN 'high'   THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low'    THEN 3
        WHEN 'none'   THEN 4
        ELSE 5
      END ASC,
      e.created_at DESC
  `).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const { id } = req.params;

  const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(id) as Email | undefined;
  if (!email) {
    return res.status(404).json({ detail: 'Email not found' });
  }

  type RawExtraction = {
    sender: string | null;
    recipients: string | null;
    date: string | null;
    subject: string | null;
    summary: string | null;
    key_facts: string | null;
  };

  const rawEx = db.prepare('SELECT * FROM extractions WHERE email_id = ?').get(id) as RawExtraction | undefined;
  const extraction = rawEx ? {
    sender: rawEx.sender,
    recipients: JSON.parse(rawEx.recipients ?? '[]') as string[],
    date: rawEx.date,
    subject: rawEx.subject,
    summary: rawEx.summary,
    key_facts: JSON.parse(rawEx.key_facts ?? '[]'),
  } : null;

  type RawRisk = { risk_level: string; rationale: string; tags: string };
  const rawRisk = db.prepare('SELECT * FROM risk_assessments WHERE email_id = ?').get(id) as RawRisk | undefined;
  const risk = rawRisk ? {
    risk_level: rawRisk.risk_level,
    rationale: rawRisk.rationale,
    tags: JSON.parse(rawRisk.tags) as string[],
  } : null;

  const entities = db.prepare(
    'SELECT id, type, value, normalized_value FROM entities WHERE email_id = ?'
  ).all(id);

  const relationships = db.prepare(
    'SELECT id, source_entity_id, target_entity_id, relationship_type FROM relationships WHERE email_id = ?'
  ).all(id);

  res.json({
    id: email.id,
    raw_content: email.raw_content,
    status: email.status,
    error_message: email.error_message,
    created_at: email.created_at,
    processed_at: email.processed_at,
    extraction,
    risk,
    entities,
    relationships,
  });
});

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    let content: string;

    if (req.file) {
      const result = validateFile(req.file.mimetype, req.file.buffer);
      if (!result.valid) {
        return res.status(422).json({ detail: result.error });
      }
      content = await extractText(req.file.mimetype, req.file.buffer);
    } else {
      const body = req.body as { content?: string };
      if (!body.content || body.content.trim().length === 0) {
        return res.status(422).json({ detail: 'Email content must not be empty' });
      }
      content = body.content;
    }

    const id = uuidv4();
    db.prepare(
      `INSERT INTO emails (id, raw_content, status, source) VALUES (?, ?, 'pending', 'user')`
    ).run(id, content);

    queueEmail(id);

    const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(id) as Email;

    return res.status(202).json({
      id: email.id,
      status: email.status,
      created_at: email.created_at,
      sender: null,
      subject: null,
      date: null,
      risk_level: null,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/retry', (req, res) => {
  const { id } = req.params;

  const email = db.prepare('SELECT * FROM emails WHERE id = ?').get(id) as Email | undefined;
  if (!email) {
    return res.status(404).json({ detail: 'Email not found' });
  }
  if (email.status !== 'failed') {
    return res.status(409).json({ detail: 'Email is not in failed state' });
  }

  db.transaction(() => {
    db.prepare('DELETE FROM relationships WHERE email_id = ?').run(id);
    db.prepare('DELETE FROM entities WHERE email_id = ?').run(id);
    db.prepare('DELETE FROM risk_assessments WHERE email_id = ?').run(id);
    db.prepare('DELETE FROM extractions WHERE email_id = ?').run(id);
    db.prepare(
      `UPDATE emails SET status = 'pending', error_message = NULL, processed_at = NULL WHERE id = ?`
    ).run(id);
  })();

  queueEmail(id);

  const updated = db.prepare('SELECT * FROM emails WHERE id = ?').get(id) as Email;

  return res.status(202).json({
    id: updated.id,
    status: updated.status,
    created_at: updated.created_at,
    sender: null,
    subject: null,
    date: null,
    risk_level: null,
  });
});

export default router;
