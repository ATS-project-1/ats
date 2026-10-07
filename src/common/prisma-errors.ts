import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from './errors';

function knownCode(err: unknown): string | undefined {
  return err instanceof Prisma.PrismaClientKnownRequestError ? err.code : undefined;
}

export function isUniqueViolation(err: unknown): boolean {
  return knownCode(err) === 'P2002';
}

export function mapPrismaError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = err.meta?.target;
        const fields = Array.isArray(target) ? target.join(', ') : target ? String(target) : '';
        throw new ConflictError(
          fields ? `Unique constraint violated on: ${fields}` : 'Unique constraint violated',
        );
      }
      case 'P2025':
        throw new NotFoundError('Record not found');
      case 'P2003':
        throw new ConflictError('Referenced record does not exist or is still in use');
      case 'P2023':
        throw new ValidationError('Malformed data (for example an invalid UUID)');
    }
  }
  throw err;
}

/** Runs a Prisma call and translates known Prisma errors into AppErrors. */
export async function withMappedErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    return mapPrismaError(err);
  }
}
