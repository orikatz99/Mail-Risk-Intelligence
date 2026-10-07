import Groq from 'groq-sdk';
import { config } from '../../config';

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 10_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err: unknown): boolean {
  if (err == null || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  if (e['status'] === 429 || e['statusCode'] === 429) return true;
  if (typeof e['message'] === 'string') {
    return e['message'].includes('429') || e['message'].toLowerCase().includes('rate limit');
  }
  return false;
}

const groqClient = new Groq({ apiKey: config.llm.apiKey });

export async function complete(prompt: string): Promise<string> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const res = await groqClient.chat.completions.create({
        model: config.llm.model,
        messages: [{ role: 'user', content: prompt }],
      });
      return res.choices[0]?.message?.content ?? '';
    } catch (err) {
      lastError = err;
      if (isRateLimitError(err) && attempt < MAX_ATTEMPTS - 1) {
        await sleep(BASE_DELAY_MS * Math.pow(2, attempt));
        continue;
      }
      break;
    }
  }

  throw new LlmError(
    `LLM call failed after ${MAX_ATTEMPTS} attempt(s)`,
    MAX_ATTEMPTS,
    lastError,
  );
}
