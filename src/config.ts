import dotenv from 'dotenv';
import { z } from 'zod';
import { durationToSeconds } from './common/duration';

// Precedence (highest first): real process environment > .env.<NODE_ENV> > .env.
// dotenv never overrides variables that are already set, so loading the more specific file
// first gives it priority over .env, and anything already in process.env beats both.
dotenv.config({ path: `.env.${process.env.NODE_ENV ?? 'development'}`, quiet: true });
dotenv.config({ quiet: true });

// Empty strings (e.g. blank keys in .env.production) count as unset.
const emptyToUndefined = (v: unknown) => (v === '' ? undefined : v);

const schema = z.object({
  NODE_ENV: z.preprocess(
    emptyToUndefined,
    z.enum(['development', 'production', 'test']).default('development'),
  ),
  PORT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(65535).default(3000)),
  DATABASE_URL: z
    .string({ error: 'is required' })
    .refine((v) => v.startsWith('postgresql://') || v.startsWith('postgres://'), {
      message: 'must start with "postgresql://" or "postgres://"',
    }),
  JWT_SECRET: z
    .string({ error: 'is required' })
    .min(32, { message: 'must be at least 32 characters' }),
  JWT_EXPIRES_IN: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .default('1h')
      .refine((v) => durationToSeconds(v) !== undefined, {
        message: 'must be <number><unit> with unit s, m, h or d (e.g. 15m, 1h, 7d)',
      }),
  ),
  BCRYPT_ROUNDS: z.preprocess(emptyToUndefined, z.coerce.number().int().min(4).max(15).default(12)),
  LOG_LEVEL: z.preprocess(
    emptyToUndefined,
    z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  ),
});

const parsed = schema.safeParse(
  Object.fromEntries(
    Object.keys(schema.shape).map((key) => [key, emptyToUndefined(process.env[key])]),
  ),
);

if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  console.error(`Invalid environment configuration:\n${lines.join('\n')}`);
  process.exit(1);
}

const env = parsed.data;

export const config = Object.freeze({
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  jwt: Object.freeze({
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    expiresInSeconds: durationToSeconds(env.JWT_EXPIRES_IN) as number,
    issuer: 'ats-backend',
    audience: 'ats-api',
  }),
  bcryptRounds: env.BCRYPT_ROUNDS,
  logLevel: env.LOG_LEVEL,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',
});

export type Config = typeof config;
