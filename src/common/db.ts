import { Prisma, PrismaClient } from '@prisma/client';
import { config } from '../config';

const verbose = config.logLevel === 'debug' || config.logLevel === 'trace';

export const prisma = new PrismaClient({
  datasourceUrl: config.databaseUrl,
  log: verbose ? ['query', 'warn', 'error'] : ['warn', 'error'],
});

/** Either the shared client or an interactive-transaction client. */
export type DbClient = PrismaClient | Prisma.TransactionClient;

export function withTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

/**
 * Runs `fn` in a new transaction when given the shared client, or directly on the caller's
 * transaction client, so repository functions compose atomically.
 */
export function inTransaction<T>(
  db: DbClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
): Promise<T> {
  return '$transaction' in db ? db.$transaction(fn, options) : fn(db);
}

export async function pingDatabase(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
}
