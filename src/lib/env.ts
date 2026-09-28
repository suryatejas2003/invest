import { z } from 'zod';

/**
 * Environment is parsed once, at module load, on the server only.
 * Optional integrations degrade to local development drivers rather than
 * failing the boot — see services/email, services/storage, services/ai.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),
  APP_URL: z.string().url().default('http://localhost:3000'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  AI_PROVIDER: z.enum(['anthropic', 'none']).default('none'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-sonnet-4-6'),

  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_REGION: z.string().default('auto'),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_PUBLIC_URL: z.string().optional(),

  EMAIL_PROVIDER: z.enum(['console', 'resend']).default('console'),
  EMAIL_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('Doorkey <hello@doorkey.app>'),
});

const parsed = schema.safeParse({
  ...process.env,
  AUTH_SECRET: process.env.AUTH_SECRET || (process.env.NODE_ENV === 'test' ? 'test-secret-value-32-chars-long!!' : undefined),
  DATABASE_URL: process.env.DATABASE_URL || (process.env.NODE_ENV === 'test' ? 'postgresql://test' : undefined),
});

if (!parsed.success) {
  const missing = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${missing}\n\nCopy .env.example to .env and fill the required values.`);
}

export const env = parsed.data;

export const features = {
  googleAuth: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
  realAI: env.AI_PROVIDER === 'anthropic' && Boolean(env.AI_API_KEY),
  objectStorage: Boolean(env.STORAGE_ENDPOINT && env.STORAGE_BUCKET && env.STORAGE_ACCESS_KEY),
  realEmail: env.EMAIL_PROVIDER === 'resend' && Boolean(env.EMAIL_API_KEY),
} as const;
