import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { ConflictError, NotFoundError, ValidationError } from './errors';
import { mapPrismaError } from './prisma-errors';

function prismaError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('boom', { code, clientVersion: 'test', meta });
}

function caught(err: unknown): unknown {
  try {
    mapPrismaError(err);
  } catch (e) {
    return e;
  }
  throw new Error('mapPrismaError did not throw');
}

describe('mapPrismaError', () => {
  it('maps P2002 to ConflictError naming the fields', () => {
    const e = caught(prismaError('P2002', { target: ['candidateId', 'jobPostingId'] }));
    expect(e).toBeInstanceOf(ConflictError);
    expect((e as ConflictError).statusCode).toBe(409);
    expect((e as ConflictError).message).toContain('candidateId, jobPostingId');
  });

  it('maps P2025 to NotFoundError', () => {
    const e = caught(prismaError('P2025'));
    expect(e).toBeInstanceOf(NotFoundError);
    expect((e as NotFoundError).statusCode).toBe(404);
  });

  it('maps P2003 to ConflictError', () => {
    const e = caught(prismaError('P2003'));
    expect(e).toBeInstanceOf(ConflictError);
    expect((e as ConflictError).statusCode).toBe(409);
    expect((e as ConflictError).message).toContain('does not exist or is still in use');
  });

  it('maps P2023 to ValidationError', () => {
    const e = caught(prismaError('P2023'));
    expect(e).toBeInstanceOf(ValidationError);
    expect((e as ValidationError).statusCode).toBe(400);
  });

  it('rethrows unknown errors unchanged', () => {
    const plain = new Error('something else');
    expect(caught(plain)).toBe(plain);
    const other = prismaError('P9999');
    expect(caught(other)).toBe(other);
  });
});
