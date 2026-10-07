import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as llmClient from '../../src/services/llm/client';
import { runExtraction } from '../../src/services/agents/extraction';

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

describe('Agent A — runExtraction', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns typed Extraction for a valid JSON response', async () => {
    mockComplete.mockResolvedValueOnce(JSON.stringify({
      sender: 'alice@example.com',
      recipients: ['bob@example.com'],
      date: '2026-06-01T10:00:00Z',
      subject: 'Test email',
      summary: 'A test email summary.',
      key_facts: [{ type: 'amount', value: '$500' }],
    }));

    const result = await runExtraction('From: alice@example.com\n\nHello');

    expect(result.sender).toBe('alice@example.com');
    expect(result.recipients).toEqual(['bob@example.com']);
    expect(result.subject).toBe('Test email');
    expect(result.key_facts).toHaveLength(1);
    expect(result.key_facts[0]).toEqual({ type: 'amount', value: '$500' });
  });

  it('handles null fields correctly', async () => {
    mockComplete.mockResolvedValueOnce(JSON.stringify({
      sender: null,
      recipients: [],
      date: null,
      subject: null,
      summary: null,
      key_facts: [],
    }));

    const result = await runExtraction('corrupted email content');

    expect(result.sender).toBeNull();
    expect(result.recipients).toEqual([]);
    expect(result.key_facts).toEqual([]);
  });

  it('throws when required fields are missing from the response', async () => {
    mockComplete.mockResolvedValueOnce(JSON.stringify({
      sender: 'alice@example.com',
      // recipients missing — required by schema
      date: null,
      subject: null,
      summary: null,
      key_facts: [],
    }));

    await expect(runExtraction('raw email')).rejects.toThrow(/schema validation failed/);
  });

  it('throws when LLM returns non-JSON text', async () => {
    mockComplete.mockResolvedValueOnce("Sorry, I can't help with that request.");

    await expect(runExtraction('raw email')).rejects.toThrow(/non-JSON/);
  });

  it('strips markdown code fences before parsing', async () => {
    mockComplete.mockResolvedValueOnce('```json\n' + JSON.stringify({
      sender: 'alice@example.com',
      recipients: [],
      date: null,
      subject: 'Test',
      summary: null,
      key_facts: [],
    }) + '\n```');

    const result = await runExtraction('raw email');
    expect(result.sender).toBe('alice@example.com');
  });
});
