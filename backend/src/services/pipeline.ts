import { v4 as uuidv4 } from 'uuid';
import { db as defaultDb, type DbInstance } from '../db';
import { runExtraction } from './agents/extraction';
import { runRiskAssessment } from './agents/risk';
import { LlmError } from './llm/client';
import type { Email } from '../models/types';

const VALID_ENTITY_TYPES = new Set(['person', 'organization', 'amount', 'account', 'location']);

export async function runPipeline(emailId: string, database: DbInstance = defaultDb): Promise<void> {
  const email = database.prepare('SELECT * FROM emails WHERE id = ?').get(emailId) as Email | undefined;
  if (!email) {
    console.error(`[pipeline] Email not found: ${emailId}`);
    return;
  }

  database.prepare(`UPDATE emails SET status = 'processing' WHERE id = ?`).run(emailId);

  try {
    // Stage 1: extraction
    const extraction = await runExtraction(email.raw_content);

    database.prepare(`
      INSERT INTO extractions (id, email_id, sender, recipients, date, subject, summary, key_facts)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      emailId,
      extraction.sender,
      JSON.stringify(extraction.recipients),
      extraction.date,
      extraction.subject,
      extraction.summary,
      JSON.stringify(extraction.key_facts),
    );

    // Stage 2: risk assessment + entities + relationships
    const risk = await runRiskAssessment(extraction, email.raw_content);

    database.prepare(`
      INSERT INTO risk_assessments (id, email_id, risk_level, rationale, tags)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      emailId,
      risk.risk_level,
      risk.rationale,
      JSON.stringify(risk.tags),
    );

    const entityIds: (string | undefined)[] = [];
    const insertEntity = database.prepare(`
      INSERT INTO entities (id, email_id, type, value, normalized_value)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const entity of risk.entities) {
      if (!VALID_ENTITY_TYPES.has(entity.type)) {
        console.warn(`[pipeline] Skipping entity with unrecognized type "${entity.type}" for email ${emailId}`);
        entityIds.push(undefined);
        continue;
      }
      const entityId = uuidv4();
      insertEntity.run(
        entityId,
        emailId,
        entity.type,
        entity.value,
        entity.value.toLowerCase().trim(),
      );
      entityIds.push(entityId);
    }

    const insertRelationship = database.prepare(`
      INSERT INTO relationships (id, email_id, source_entity_id, target_entity_id, relationship_type)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const rel of risk.relationships) {
      const sourceId = entityIds[rel.source_entity_index];
      const targetId = entityIds[rel.target_entity_index];
      if (sourceId == null || targetId == null) {
        console.warn(`[pipeline] Skipping relationship: entity index out of bounds for email ${emailId}`);
        continue;
      }
      insertRelationship.run(uuidv4(), emailId, sourceId, targetId, rel.relationship_type);
    }

    database.prepare(`
      UPDATE emails SET status = 'done', processed_at = datetime('now') WHERE id = ?
    `).run(emailId);

  } catch (err) {
    let message = err instanceof Error ? err.message : String(err);
    if (err instanceof LlmError && err.cause instanceof Error) {
      message += `: ${err.cause.message}`;
    }
    console.error(`[pipeline] Failed to process email ${emailId}:`, message);
    database.prepare(`
      UPDATE emails SET status = 'failed', error_message = ?, processed_at = datetime('now') WHERE id = ?
    `).run(message, emailId);
  }
}

let processingQueue = Promise.resolve();

export function queueEmail(emailId: string): void {
  processingQueue = processingQueue
    .then(() => runPipeline(emailId))
    .catch((err) => console.error(`[queueEmail] Unexpected uncaught error for ${emailId}:`, err));
}
