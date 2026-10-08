import type { Prisma } from '@prisma/client';
import { inTransaction, prisma, type DbClient } from '../common/db';
import type { JobPostingStatus, Seniority } from '../common/enums';
import { isUuid } from '../common/ids';
import { toSkipTake, type PageParams, type Paginated } from '../common/pagination';
import { withMappedErrors } from '../common/prisma-errors';

const jobPostingSelect = {
  id: true,
  organizationId: true,
  createdById: true,
  title: true,
  description: true,
  requiredSkills: true,
  preferredSkills: true,
  seniority: true,
  location: true,
  isRemote: true,
  status: true,
  publishedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.JobPostingSelect;

export type JobPostingRecord = Prisma.JobPostingGetPayload<{ select: typeof jobPostingSelect }>;

export interface CreateJobPostingInput {
  organizationId: string;
  createdById?: string | null;
  title: string;
  description: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  seniority: Seniority;
  location: string;
  isRemote?: boolean;
  status?: JobPostingStatus;
  publishedAt?: Date | null;
  closedAt?: Date | null;
}

export type UpdateJobPostingInput = Partial<
  Omit<CreateJobPostingInput, 'organizationId' | 'createdById'>
>;

export interface JobPostingFilters {
  status?: JobPostingStatus;
  organizationId?: string;
  seniority?: Seniority;
  /** Case-insensitive substring match. */
  location?: string;
  /** Matches postings whose requiredSkills contain this exact skill. */
  skill?: string;
}

export const jobPostingRepository = {
  create(input: CreateJobPostingInput, db: DbClient = prisma): Promise<JobPostingRecord> {
    return withMappedErrors(() => db.jobPosting.create({ data: input, select: jobPostingSelect }));
  },

  async findById(id: string, db: DbClient = prisma): Promise<JobPostingRecord | null> {
    if (!isUuid(id)) return null;
    return withMappedErrors(() =>
      db.jobPosting.findUnique({ where: { id }, select: jobPostingSelect }),
    );
  },

  update(
    id: string,
    data: UpdateJobPostingInput,
    db: DbClient = prisma,
  ): Promise<JobPostingRecord> {
    return withMappedErrors(() =>
      db.jobPosting.update({ where: { id }, data, select: jobPostingSelect }),
    );
  },

  getJobs(
    filters: JobPostingFilters,
    page: number,
    limit: number,
    db: DbClient = prisma,
  ): Promise<Paginated<JobPostingRecord>> {
    const { skip, take, page: currentPage, pageSize } = toSkipTake({
      page,
      pageSize: limit,
    });
    const where: Prisma.JobPostingWhereInput = {
      AND: [
        filters.status ? { status: filters.status } : {},
        filters.organizationId ? { organizationId: filters.organizationId } : {},
        filters.seniority ? { seniority: filters.seniority } : {},
        filters.location ? { location: { contains: filters.location, mode: 'insensitive' } } : {},
        filters.skill ? { requiredSkills: { has: filters.skill } } : {},
      ],
    };

    return withMappedErrors(() =>
      inTransaction(
        db,
        async (tx) => {
          const total = await tx.jobPosting.count({ where });
          const items = await tx.jobPosting.findMany({
            where,
            select: jobPostingSelect,
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            skip,
            take,
          });
          return { items, total, page: currentPage, pageSize };
        },
        { isolationLevel: 'RepeatableRead' },
      ),
    );
  },

  list(
    filters: JobPostingFilters,
    pageParams: PageParams,
    db: DbClient = prisma,
  ): Promise<Paginated<JobPostingRecord>> {
    return this.getJobs(filters, pageParams.page, pageParams.pageSize, db);
  },
};
