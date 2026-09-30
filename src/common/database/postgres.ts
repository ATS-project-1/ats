import { Pool } from 'pg';
import { config } from '../config/env.config';

export const dbPool = new Pool({
  connectionString: config.DATABASE_URL,
});

export const connectPostgres = async (): Promise<void> => {
  try {
    const client = await dbPool.connect();
    console.log('Successfully connected to PostgreSQL database');
    client.release();
  } catch (error) {
    console.error('Failed to connect to PostgreSQL database:', error);
    process.exit(1);
  }
};