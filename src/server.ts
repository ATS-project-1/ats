import { config } from './config';
import { createApp } from './app';
import { pingDatabase } from './common/db';

function dbHost(): string {
  try {
    const url = new URL(config.databaseUrl);
    return `${url.hostname}${url.port ? `:${url.port}` : ''}`;
  } catch {
    return 'unknown host';
  }
}

async function main(): Promise<void> {
  try {
    await pingDatabase();
  } catch (err) {
    const reason = err instanceof Error ? err.message.trim().split('\n').pop() : String(err);
    console.error(`Could not connect to PostgreSQL at ${dbHost()}: ${reason}`);
    process.exit(1);
  }

  createApp().listen(config.port, () => {
    console.log(`Server listening on http://localhost:${config.port}`);
  });
}

void main();
