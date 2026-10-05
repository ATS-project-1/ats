import * as dotenv from 'dotenv';
dotenv.config();

interface AppConfig {
  PORT: number;
  NODE_ENV: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const config: AppConfig = {
  PORT: parseInt(getRequiredEnv('PORT'), 10),
  NODE_ENV: getRequiredEnv('NODE_ENV'),
  DB_HOST: getRequiredEnv('DB_HOST'),
  DB_PORT: parseInt(getRequiredEnv('DB_PORT'), 10),
  DB_USER: getRequiredEnv('DB_USER'),
  DB_PASSWORD: getRequiredEnv('DB_PASSWORD'),
  DB_NAME: getRequiredEnv('DB_NAME'),
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: getRequiredEnv('JWT_EXPIRES_IN'),
};

export default config;
