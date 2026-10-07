import type { Prisma } from '@prisma/client';
import { inTransaction, prisma, type DbClient } from '../common/db';
import { isUuid } from '../common/ids';
import { toSkipTake, type PageParams, type Paginated } from '../common/pagination';
import { withMappedErrors } from '../common/prisma-errors';

const matchResultSelect = {
  id: true,
  resumeVersionId: true,
  jobPostingId: true,
  scorer: true,
  score: true,
  breakdown: true,
  jobPostingUpdatedAt: true,
  computedAt: true,
} satisfies Prisma.MatchResultSelect;

export type MatchResultRecord = Prisma.MatchResultGetPayload<{ select: typeof matchResultSelect }>;

export interface UpsertMatchResultInput {
  resumeVersionId: string;
  jobPostingId: string;
  scorer: string;
  score: number;
  breakdown: Prisma.InputJsonValue;
  jobPostingUpdatedAt: Date;
}

export const matchResultRepository = {
  upsert(input: UpsertMatchResultInput, db: DbClient = prisma): Promise<MatchResultRecord> {
    const { resumeVersionId, jobPostingId, scorer, score, breakdown, jobPostingUpdatedAt } = input;
    return withMappedErrors(() =>
      db.matchResult.upsert({
        where: { resumeVersionId_jobPostingId_scorer: { resumeVersionId, jobPostingId, scorer } },
        create: {
          resumeVersionId,
          jobPostingId,
          scorer,
          score,
          breakdown,
          jobPostingUpdatedAt,
          computedAt: new Date(),
        },
        update: { score, breakdown, jobPostingUpdatedAt, computedAt: new Date() },
        select: matchResultSelect,
      }),
    );
  },

  async find(
    resumeVersionId: string,
    jobPostingId: string,
    scorer: string,
    db: DbClient = prisma,
  ): Promise<MatchResultRecord | null> {
    if (!isUuid(resumeVersionId) || !isUuid(jobPostingId)) return null;
    return withMappedErrors(() =>
      db.matchResult.findUnique({
        where: { resumeVersionId_jobPostingId_scorer: { resumeVersionId, jobPostingId, scorer } },
        select: matchResultSelect,
      }),
    );
  },

  listForJobPosting(
    jobPostingId: string,
    pageParams: PageParams,
    db: DbClient = prisma,
  ): Promise<Paginated<MatchResultRecord>> {
    const { skip, take, page, pageSize } = toSkipTake(pageParams);
    const where: Prisma.MatchResultWhereInput = { jobPostingId };

    return withMappedErrors(() =>
      inTransaction(
        db,
        async (tx) => {
          const total = await tx.matchResult.count({ where });
          const items = await tx.matchResult.findMany({
            where,
            select: matchResultSelect,
            orderBy: [{ score: 'desc' }, { id: 'asc' }],
            skip,
            take,
          });
          return { items, total, page, pageSize };
        },
        { isolationLevel: 'RepeatableRead' },
      ),
    );
  },
};
