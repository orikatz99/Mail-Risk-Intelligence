import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as llmClient from '../../src/services/llm/client';
import { runRiskAssessment } from '../../src/services/agents/risk';
import type { ExtractionResult } from '../../src/services/agents/extraction';

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

const sampleExtraction: ExtractionResult = {
  sender: 'alice@example.com',
  recipients: ['bob@example.com'],
  date: '2026-06-01T10:00:00Z',
  subject: 'Test email',
  summary: 'A test email.',
  key_facts: [],
};

describe('Agent B — runRiskAssessment', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns typed risk output for a valid JSON response', async () => {
    mockComplete.mockResolvedValueOnce(JSON.stringify({
      risk_level: 'high',
      rationale: 'Wire fraud indicators detected.',
      tags: ['wire-fraud', 'bec-fraud'],
      entities: [
        { type: 'person', value: 'Alice' },
        { type: 'organization', value: 'Acme Corp' },
      ],
      relationships: [
        { source_entity_index: 0, target_entity_index: 1, relationship_type: 'works_for' },
      ],
    }));

    const result = await runRiskAssessment(sampleExtraction, 'raw email');

    expect(result.risk_level).toBe('high');
    expect(result.rationale).toBe('Wire fraud indicators detected.');
    expect(result.tags).toContain('wire-fraud');
    expect(result.entities).toHaveLength(2);
    expect(result.relationships[0].relationship_type).toBe('works_for');
  });

  it('throws when risk_level is out-of-range (must not default to "none")', async () => {
    mockComplete.mockResolvedValueOnce(JSON.stringify({
      risk_level: 'critical', // not a valid enum value
      rationale: 'Very dangerous.',
      tags: ['threat'],
      entities: [],
      relationships: [],
    }));

    await expect(runRiskAssessment(sampleExtraction, 'raw email')).rejects.toThrow(/schema validation failed/);
  });

  it('throws when required field "rationale" is missing', async () => {
    mockComplete.mockResolvedValueOnce(JSON.stringify({
      risk_level: 'low',
      // rationale missing
      tags: [],
      entities: [],
      relationships: [],
    }));

    await expect(runRiskAssessment(sampleExtraction, 'raw email')).rejects.toThrow(/schema validation failed/);
  });

  it('throws when LLM returns non-JSON text', async () => {
    mockComplete.mockResolvedValueOnce('Unable to assess risk at this time.');

    await expect(runRiskAssessment(sampleExtraction, 'raw email')).rejects.toThrow(/non-JSON/);
  });

  it('accepts all valid risk_level values', async () => {
    for (const level of ['none', 'low', 'medium', 'high'] as const) {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        risk_level: level,
        rationale: 'Test.',
        tags: [],
        entities: [],
        relationships: [],
      }));
      const result = await runRiskAssessment(sampleExtraction, 'raw email');
      expect(result.risk_level).toBe(level);
    }
  });
});
