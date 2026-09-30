import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment-specific file if NODE_ENV is set, fallback to default .env
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = `.env.${nodeEnv}`;

dotenv.config({ path: path.resolve(process.cwd(), envFile) });
dotenv.config(); // Fallback to standard .env for shared values

const envSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)).default('4000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid connection string' }),
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables detected:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
};

export const config = parseEnv();
export type Config = z.infer<typeof envSchema>;