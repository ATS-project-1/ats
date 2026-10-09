import type { Prisma } from '@prisma/client';
import { inTransaction, prisma, type DbClient } from '../common/db';
import type { ApplicationStatus } from '../common/enums';
import { ConflictError } from '../common/errors';
import { isUuid } from '../common/ids';
import { toSkipTake, type PageParams, type Paginated } from '../common/pagination';
import { withMappedErrors } from '../common/prisma-errors';

const applicationSelect = {
  id: true,
  candidateId: true,
  jobPostingId: true,
  resumeVersionId: true,
  status: true,
  submittedAt: true,
  updatedAt: true,
} satisfies Prisma.ApplicationSelect;

const statusHistorySelect = {
  id: true,
  applicationId: true,
  fromStatus: true,
  toStatus: true,
  changedById: true,
  note: true,
  changedAt: true,
} satisfies Prisma.ApplicationStatusHistorySelect;

export type ApplicationRecord = Prisma.ApplicationGetPayload<{ select: typeof applicationSelect }>;
export type ApplicationStatusHistoryRecord = Prisma.ApplicationStatusHistoryGetPayload<{
  select: typeof statusHistorySelect;
}>;

export interface CreateApplicationInput {
  candidateId: string;
  jobPostingId: string;
  resumeVersionId: string;
}

export const applicationRepository = {
  async createApplication(
    input: CreateApplicationInput,
    changedById: string,
    db: DbClient = prisma,
  ): Promise<ApplicationRecord> {
    return inTransaction(db, async (tx) => {
      const application = await tx.application.create({
        data: { ...input, status: 'SUBMITTED' },
        select: applicationSelect,
      });
      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          fromStatus: null,
          toStatus: 'SUBMITTED',
          changedById,
        },
      });
      return application;
    });
  },

  /** Creates the application and its first history row atomically. */
  createWithInitialHistory(
    input: CreateApplicationInput,
    changedById: string | null,
    db: DbClient = prisma,
  ): Promise<ApplicationRecord> {
    return withMappedErrors(() =>
      inTransaction(db, async (tx) => {
        const application = await tx.application.create({
          data: { ...input, status: 'SUBMITTED' },
          select: applicationSelect,
        });
        await tx.applicationStatusHistory.create({
          data: {
            applicationId: application.id,
            fromStatus: null,
            toStatus: 'SUBMITTED',
            changedById,
          },
        });
        return application;
      }),
    );
  },

  async findById(id: string, db: DbClient = prisma): Promise<ApplicationRecord | null> {
    if (!isUuid(id)) return null;
    return withMappedErrors(() =>
      db.application.findUnique({ where: { id }, select: applicationSelect }),
    );
  },

  async findByCandidateAndPosting(
    candidateId: string,
    jobPostingId: string,
    db: DbClient = prisma,
  ): Promise<ApplicationRecord | null> {
    if (!isUuid(candidateId) || !isUuid(jobPostingId)) return null;
    return withMappedErrors(() =>
      db.application.findUnique({
        where: { candidateId_jobPostingId: { candidateId, jobPostingId } },
        select: applicationSelect,
      }),
    );
  },

  listByJobPosting(
    jobPostingId: string,
    filters: { status?: ApplicationStatus },
    pageParams: PageParams,
    db: DbClient = prisma,
  ): Promise<Paginated<ApplicationRecord>> {
    const { skip, take, page, pageSize } = toSkipTake(pageParams);
    const where: Prisma.ApplicationWhereInput = {
      jobPostingId,
      ...(filters.status ? { status: filters.status } : {}),
    };

    return withMappedErrors(() =>
      inTransaction(
        db,
        async (tx) => {
          const total = await tx.application.count({ where });
          const items = await tx.application.findMany({
            where,
            select: applicationSelect,
            orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }],
            skip,
            take,
          });
          return { items, total, page, pageSize };
        },
        { isolationLevel: 'RepeatableRead' },
      ),
    );
  },

  /**
   * Compare-and-set: only updates if the status is still `fromStatus`, then appends a history
   * row, atomically.
   */
  transitionStatus(
    id: string,
    fromStatus: ApplicationStatus,
    toStatus: ApplicationStatus,
    changedById: string | null,
    note?: string,
    db: DbClient = prisma,
  ): Promise<ApplicationRecord> {
    return withMappedErrors(() =>
      inTransaction(db, async (tx) => {
        const { count } = await tx.application.updateMany({
          where: { id, status: fromStatus },
          data: { status: toStatus },
        });
        if (count === 0) {
          throw new ConflictError('application status changed concurrently or does not match');
        }
        await tx.applicationStatusHistory.create({
          data: { applicationId: id, fromStatus, toStatus, changedById, note },
        });
        return tx.application.findUniqueOrThrow({ where: { id }, select: applicationSelect });
      }),
    );
  },

  getStatusHistory(
    applicationId: string,
    db: DbClient = prisma,
  ): Promise<ApplicationStatusHistoryRecord[]> {
    return withMappedErrors(() =>
      db.applicationStatusHistory.findMany({
        where: { applicationId },
        select: statusHistorySelect,
        orderBy: [{ changedAt: 'asc' }, { id: 'asc' }],
      }),
    );
  },
};
