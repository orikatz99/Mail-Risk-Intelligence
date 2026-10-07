import { Router } from 'express';
import { db } from '../db';
import type { Email } from '../models/types';

const router = Router();

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

// POST /api/emails           — implemented in T035 (US4)
// POST /api/emails/:id/retry — implemented in T036 (US4)

export default router;
