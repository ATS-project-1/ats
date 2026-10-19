import type { Prisma } from '@prisma/client';
import { prisma, type DbClient } from '../common/db';
import { isUuid } from '../common/ids';
import { withMappedErrors } from '../common/prisma-errors';

const applicationMatchResultSelect = {
  id: true,
  applicationId: true,
  score: true,
  breakdown: true,
  computedAt: true,
} satisfies Prisma.MatchResultSelect;

export type ApplicationMatchResultRecord = Prisma.MatchResultGetPayload<{
  select: typeof applicationMatchResultSelect;
}>;

export const applicationMatchResultRepository = {
  upsert(
    applicationId: string,
    score: number,
    breakdown: Prisma.InputJsonValue,
    db: DbClient = prisma,
  ): Promise<ApplicationMatchResultRecord> {
    return withMappedErrors(() =>
      db.matchResult.upsert({
        where: { applicationId },
        create: { applicationId, score, breakdown },
        update: { score, breakdown, computedAt: new Date() },
        select: applicationMatchResultSelect,
      }),
    );
  },

  findByApplicationId(
    applicationId: string,
    db: DbClient = prisma,
  ): Promise<ApplicationMatchResultRecord | null> {
    if (!isUuid(applicationId)) return Promise.resolve(null);
    return withMappedErrors(() =>
      db.matchResult.findUnique({
        where: { applicationId },
        select: applicationMatchResultSelect,
      }),
    );
  },
};
