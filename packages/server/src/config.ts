import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),
  SEATS_AERO_API_KEY: z.string().optional(),
  AMADEUS_CLIENT_ID: z.string().optional(),
  AMADEUS_CLIENT_SECRET: z.string().optional(),
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  LOG_LLM_REQUESTS: z
    .string()
    .transform(v => v === 'true')
    .default('false'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = parsed.data;

export const LLM_MODELS = {
  advisor: 'claude-sonnet-4-6',
  fast: 'claude-haiku-4-5-20251001',
  heavy: 'claude-opus-4-6',
} as const;
