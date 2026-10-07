import type { Prisma } from '@prisma/client';
import { prisma, type DbClient } from '../common/db';
import type { ResumeSource } from '../common/enums';
import { isUuid } from '../common/ids';
import { withMappedErrors } from '../common/prisma-errors';

const resumeSelect = {
  id: true,
  candidateId: true,
  title: true,
  source: true,
  content: true,
  templateId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ResumeSelect;

// Lists omit the (potentially large) content.
const resumeSummarySelect = {
  id: true,
  candidateId: true,
  title: true,
  source: true,
  templateId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ResumeSelect;

export type ResumeRecord = Prisma.ResumeGetPayload<{ select: typeof resumeSelect }>;
export type ResumeSummaryRecord = Prisma.ResumeGetPayload<{ select: typeof resumeSummarySelect }>;

export interface CreateResumeInput {
  candidateId: string;
  title: string;
  source?: ResumeSource;
  content: Prisma.InputJsonValue;
  templateId?: string | null;
}

export interface UpdateResumeInput {
  title?: string;
  content?: Prisma.InputJsonValue;
  templateId?: string | null;
}

export const resumeRepository = {
  create(input: CreateResumeInput, db: DbClient = prisma): Promise<ResumeRecord> {
    return withMappedErrors(() => db.resume.create({ data: input, select: resumeSelect }));
  },

  async findById(id: string, db: DbClient = prisma): Promise<ResumeRecord | null> {
    if (!isUuid(id)) return null;
    return withMappedErrors(() => db.resume.findUnique({ where: { id }, select: resumeSelect }));
  },

  listByCandidate(candidateId: string, db: DbClient = prisma): Promise<ResumeSummaryRecord[]> {
    return withMappedErrors(() =>
      db.resume.findMany({
        where: { candidateId },
        select: resumeSummarySelect,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      }),
    );
  },

  updateContent(id: string, data: UpdateResumeInput, db: DbClient = prisma): Promise<ResumeRecord> {
    return withMappedErrors(() => db.resume.update({ where: { id }, data, select: resumeSelect }));
  },
};
