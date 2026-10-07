import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as llmClient from '../../src/services/llm/client';
import { createDb } from '../../src/db';
import { runPipeline } from '../../src/services/pipeline';
import type { DbInstance } from '../../src/db';

vi.mock('../../src/services/llm/client', () => ({
  complete: vi.fn(),
  LlmError: class LlmError extends Error {
    constructor(msg: string, public attempts = 0, public cause?: unknown) {
      super(msg);
      this.name = 'LlmError';
    }
  },
}));

const mockComplete = vi.mocked(llmClient.complete);

const EXTRACTION_RESPONSE = JSON.stringify({
  sender: 'alice@example.com',
  recipients: ['bob@example.com'],
  date: '2026-06-01T10:00:00Z',
  subject: 'Test email',
  summary: 'A test email summary.',
  key_facts: [{ type: 'amount', value: '$500' }],
});

const RISK_RESPONSE = JSON.stringify({
  risk_level: 'high',
  rationale: 'Suspicious wire transfer request.',
  tags: ['wire-fraud'],
  entities: [
    { type: 'person', value: 'Alice' },
    { type: 'amount', value: '$500' },
  ],
  relationships: [
    { source_entity_index: 0, target_entity_index: 1, relationship_type: 'requests_transfer_of' },
  ],
});

function insertTestEmail(database: DbInstance, id = 'test-email-001'): string {
  database.prepare(
    `INSERT INTO emails (id, raw_content, status, source) VALUES (?, ?, 'pending', 'user')`
  ).run(id, 'From: alice@example.com\n\nPlease wire $500.');
  return id;
}

describe('Pipeline integration', () => {
  let testDb: DbInstance;

  beforeEach(() => {
    testDb = createDb(':memory:');
    vi.resetAllMocks();
  });

  it('writes all rows and sets status to done on successful run', async () => {
    const emailId = insertTestEmail(testDb);

    mockComplete
      .mockResolvedValueOnce(EXTRACTION_RESPONSE)
      .mockResolvedValueOnce(RISK_RESPONSE);

    await runPipeline(emailId, testDb);

    const email = testDb.prepare('SELECT * FROM emails WHERE id = ?').get(emailId) as { status: string; processed_at: string | null };
    expect(email.status).toBe('done');
    expect(email.processed_at).not.toBeNull();

    const extraction = testDb.prepare('SELECT * FROM extractions WHERE email_id = ?').get(emailId) as { sender: string } | undefined;
    expect(extraction).toBeDefined();
    expect(extraction!.sender).toBe('alice@example.com');

    const risk = testDb.prepare('SELECT * FROM risk_assessments WHERE email_id = ?').get(emailId) as { risk_level: string } | undefined;
    expect(risk).toBeDefined();
    expect(risk!.risk_level).toBe('high');

    const entities = testDb.prepare('SELECT * FROM entities WHERE email_id = ?').all(emailId) as unknown[];
    expect(entities.length).toBeGreaterThanOrEqual(1);

    const relationships = testDb.prepare('SELECT * FROM relationships WHERE email_id = ?').all(emailId) as unknown[];
    expect(relationships).toHaveLength(1);
  });

  it('sets status to failed with error_message when Agent A fails', async () => {
    const emailId = insertTestEmail(testDb);

    mockComplete.mockRejectedValueOnce(new Error('LLM connection timeout'));

    await runPipeline(emailId, testDb);

    const email = testDb.prepare('SELECT * FROM emails WHERE id = ?').get(emailId) as { status: string; error_message: string | null };
    expect(email.status).toBe('failed');
    expect(email.error_message).toContain('LLM connection timeout');

    const extraction = testDb.prepare('SELECT * FROM extractions WHERE email_id = ?').get(emailId);
    expect(extraction).toBeUndefined();
  });

  it('sets status to failed with error_message when Agent B fails', async () => {
    const emailId = insertTestEmail(testDb);

    mockComplete
      .mockResolvedValueOnce(EXTRACTION_RESPONSE)
      .mockRejectedValueOnce(new Error('Agent B schema error'));

    await runPipeline(emailId, testDb);

    const email = testDb.prepare('SELECT * FROM emails WHERE id = ?').get(emailId) as { status: string; error_message: string | null };
    expect(email.status).toBe('failed');
    expect(email.error_message).toContain('Agent B schema error');

    const extraction = testDb.prepare('SELECT * FROM extractions WHERE email_id = ?').get(emailId);
    expect(extraction).toBeDefined();

    const risk = testDb.prepare('SELECT * FROM risk_assessments WHERE email_id = ?').get(emailId);
    expect(risk).toBeUndefined();
  });

  it('does nothing when emailId does not exist', async () => {
    await runPipeline('nonexistent-id', testDb);
    expect(mockComplete).not.toHaveBeenCalled();
  });
});
