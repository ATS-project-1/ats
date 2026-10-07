import type { Prisma } from '@prisma/client';
import { prisma, type DbClient } from '../common/db';
import type { InterviewStatus } from '../common/enums';
import { withMappedErrors } from '../common/prisma-errors';

const interviewSelect = {
  id: true,
  applicationId: true,
  scheduledAt: true,
  status: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.InterviewSelect;

export type InterviewRecord = Prisma.InterviewGetPayload<{ select: typeof interviewSelect }>;

export interface CreateInterviewInput {
  applicationId: string;
  scheduledAt: Date;
  status?: InterviewStatus;
  notes?: string | null;
}

export const interviewRepository = {
  create(input: CreateInterviewInput, db: DbClient = prisma): Promise<InterviewRecord> {
    return withMappedErrors(() => db.interview.create({ data: input, select: interviewSelect }));
  },

  listByApplication(applicationId: string, db: DbClient = prisma): Promise<InterviewRecord[]> {
    return withMappedErrors(() =>
      db.interview.findMany({
        where: { applicationId },
        select: interviewSelect,
        orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }],
      }),
    );
  },
};
