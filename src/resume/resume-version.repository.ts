// Resume versions are immutable snapshots: this repository deliberately provides NO update or
// delete functions. Do not add them; create a new snapshot instead.
import type { Prisma } from '@prisma/client';
import { inTransaction, prisma, type DbClient } from '../common/db';
import { ConflictError, NotFoundError } from '../common/errors';
import { isUuid } from '../common/ids';
import { isUniqueViolation, mapPrismaError, withMappedErrors } from '../common/prisma-errors';

const MAX_SNAPSHOT_ATTEMPTS = 3;

const resumeVersionSelect = {
  id: true,
  resumeId: true,
  versionNumber: true,
  content: true,
  sourceFileKey: true,
  rawText: true,
  createdAt: true,
} satisfies Prisma.ResumeVersionSelect;

export type ResumeVersionRecord = Prisma.ResumeVersionGetPayload<{
  select: typeof resumeVersionSelect;
}>;

export const resumeVersionRepository = {
  /**
   * Snapshots the resume's current content as the next version number. Retries when a concurrent
   * snapshot wins the (resumeId, versionNumber) race. Retrying only works when this function
   * opens its own transaction; inside a caller's transaction a unique violation aborts that
   * transaction, so it is mapped and thrown immediately.
   */
  async createSnapshot(
    resumeId: string,
    data: { sourceFileKey?: string | null; rawText?: string | null } = {},
    db: DbClient = prisma,
  ): Promise<ResumeVersionRecord> {
    const canRetry = '$transaction' in db;

    for (let attempt = 1; attempt <= MAX_SNAPSHOT_ATTEMPTS; attempt++) {
      try {
        return await inTransaction(db, async (tx) => {
          const resume = await tx.resume.findUnique({
            where: { id: resumeId },
            select: { content: true },
          });
          if (!resume) throw new NotFoundError('Resume not found');

          const { _max } = await tx.resumeVersion.aggregate({
            where: { resumeId },
            _max: { versionNumber: true },
          });

          return tx.resumeVersion.create({
            data: {
              resumeId,
              versionNumber: (_max.versionNumber ?? 0) + 1,
              content: resume.content as Prisma.InputJsonValue,
              sourceFileKey: data.sourceFileKey,
              rawText: data.rawText,
            },
            select: resumeVersionSelect,
          });
        });
      } catch (err) {
        if (canRetry && isUniqueViolation(err)) {
          if (attempt < MAX_SNAPSHOT_ATTEMPTS) continue;
          throw new ConflictError('could not allocate a resume version number; try again');
        }
        return mapPrismaError(err);
      }
    }
    throw new ConflictError('could not allocate a resume version number; try again');
  },

  async findById(id: string, db: DbClient = prisma): Promise<ResumeVersionRecord | null> {
    if (!isUuid(id)) return null;
    return withMappedErrors(() =>
      db.resumeVersion.findUnique({ where: { id }, select: resumeVersionSelect }),
    );
  },

  listByResume(resumeId: string, db: DbClient = prisma): Promise<ResumeVersionRecord[]> {
    return withMappedErrors(() =>
      db.resumeVersion.findMany({
        where: { resumeId },
        select: resumeVersionSelect,
        orderBy: { versionNumber: 'desc' },
      }),
    );
  },
};
