import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export interface LlmConfig {
  apiKey: string;
  model:  string;
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  llm: {
    apiKey: requireEnv('GROQ_API_KEY'),
    model:  requireEnv('GROQ_MODEL'),
  } satisfies LlmConfig,
};
