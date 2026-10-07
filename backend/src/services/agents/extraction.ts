import { z } from 'zod';
import { complete } from '../llm/client';

const KeyFactSchema = z.object({
  type: z.enum(['amount', 'account', 'date', 'reference']),
  value: z.string(),
});

const ExtractionSchema = z.object({
  sender:     z.string().nullable(),
  recipients: z.array(z.string()),
  date:       z.string().nullable(),
  subject:    z.string().nullable(),
  summary:    z.string().nullable(),
  key_facts:  z.array(KeyFactSchema),
});

export type ExtractionResult = z.infer<typeof ExtractionSchema>;

function stripCodeFences(text: string): string {
  const match = text.trim().match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return match ? match[1].trim() : text.trim();
}

function buildPrompt(rawContent: string): string {
  return `You are an email data extraction assistant. Extract structured information from the following raw email and return ONLY a valid JSON object — no markdown, no code fences, no explanation.

JSON structure:
{
  "sender": "sender address or null",
  "recipients": ["array of recipient addresses"],
  "date": "ISO 8601 date string from email headers, or null",
  "subject": "subject line or null",
  "summary": "1-3 sentence summary or null",
  "key_facts": [
    { "type": "amount|account|date|reference", "value": "extracted value" }
  ]
}

key_facts types:
- "amount"    — monetary amounts (e.g. "$184,500")
- "account"   — account/routing numbers or financial identifiers
- "date"      — specific dates mentioned in the body (not the email send date)
- "reference" — invoice IDs, reference numbers, case numbers

Use null for fields that cannot be determined. Use [] for empty arrays.

Raw email:
---
${rawContent}
---`;
}

export async function runExtraction(rawContent: string): Promise<ExtractionResult> {
  const raw = await complete(buildPrompt(rawContent));
  const cleaned = stripCodeFences(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Agent A returned non-JSON response: ${cleaned.slice(0, 200)}`);
  }

  const result = ExtractionSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Agent A schema validation failed: ${result.error.message}`);
  }

  return result.data;
}
