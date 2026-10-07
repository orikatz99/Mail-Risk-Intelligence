import { z } from 'zod';
import { complete } from '../llm/client';
import type { ExtractionResult } from './extraction';

const AgentEntitySchema = z.object({
  type:  z.string(),
  value: z.string(),
});

const AgentRelationshipSchema = z.object({
  source_entity_index: z.number().int().nonnegative(),
  target_entity_index: z.number().int().nonnegative(),
  relationship_type:   z.string(),
});

const RiskSchema = z.object({
  risk_level:    z.enum(['none', 'low', 'medium', 'high']),
  rationale:     z.string(),
  tags:          z.array(z.string()),
  entities:      z.array(AgentEntitySchema),
  relationships: z.array(AgentRelationshipSchema),
});

export type RiskResult = z.infer<typeof RiskSchema>;

function stripCodeFences(text: string): string {
  const match = text.trim().match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return match ? match[1].trim() : text.trim();
}

function buildPrompt(extraction: ExtractionResult, rawContent: string): string {
  return `You are an email risk assessment assistant for a corporate compliance team.

Analyze the email and its extracted data, then return ONLY a valid JSON object — no markdown, no code fences, no explanation.

JSON structure:
{
  "risk_level": "none|low|medium|high",
  "rationale": "1-3 sentence explanation of the risk level",
  "tags": ["tag1", "tag2"],
  "entities": [
    { "type": "person|organization|amount|account|location", "value": "extracted entity name/value" }
  ],
  "relationships": [
    { "source_entity_index": 0, "target_entity_index": 1, "relationship_type": "descriptive_label" }
  ]
}

Risk levels:
- "none"   — routine, no concern
- "low"    — minor anomaly worth noting
- "medium" — notable risk indicator, warrants review
- "high"   — strong indicator of fraud, insider threat, data exfiltration, physical threat, or legal exposure

Common tags: bec-fraud, wire-fraud, insider-threat, data-exfiltration, phishing, mnpi-risk, threat-language, financial-anomaly, policy-violation, suspicious-redirection

IMPORTANT: risk_level MUST be exactly one of: none, low, medium, high. Any other value is invalid.
IMPORTANT: entity type MUST be exactly one of: person, organization, amount, account, location. Do NOT use "reference", "date", or any other value. Invoice numbers and reference IDs that don't fit should be typed as "account" or omitted.

For relationships, use 0-based indices into the entities array you define.
Relationship types are free-form descriptive labels (e.g. "requests_transfer_to", "employed_by", "sent_document_to").

Extracted data:
${JSON.stringify(extraction, null, 2)}

Raw email:
---
${rawContent}
---`;
}

export async function runRiskAssessment(
  extraction: ExtractionResult,
  rawContent: string,
): Promise<RiskResult> {
  const raw = await complete(buildPrompt(extraction, rawContent));
  const cleaned = stripCodeFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Agent B returned non-JSON response: ${cleaned.slice(0, 200)}`);
  }

  const result = RiskSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Agent B schema validation failed: ${result.error.message}`);
  }

  return result.data;
}
