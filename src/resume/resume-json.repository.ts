import type { Prisma } from '@prisma/client';
import { prisma, type DbClient } from '../common/db';
import { withMappedErrors } from '../common/prisma-errors';

const resumeJsonSelect = {
  id: true,
  candidateId: true,
  content: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ResumeJsonSelect;

export type ResumeJsonRecord = Prisma.ResumeJsonGetPayload<{
  select: typeof resumeJsonSelect;
}>;

export const resumeJsonRepository = {
  /** Insert a new resume document for a candidate. */
  createResume(
    candidateId: string,
    content: Prisma.InputJsonValue,
    db: DbClient = prisma,
  ): Promise<ResumeJsonRecord> {
    return withMappedErrors(() =>
      db.resumeJson.create({
        data: { candidateId, content },
        select: resumeJsonSelect,
      }),
    );
  },

  /** Return the resume document for a candidate, or null when none exists. */
  getResumeByCandidateId(
    candidateId: string,
    db: DbClient = prisma,
  ): Promise<ResumeJsonRecord | null> {
    return withMappedErrors(() =>
      db.resumeJson.findUnique({
        where: { candidateId },
        select: resumeJsonSelect,
      }),
    );
  },

  /** Update the content of an existing resume document by its id. */
  updateResume(
    resumeId: string,
    content: Prisma.InputJsonValue,
    db: DbClient = prisma,
  ): Promise<ResumeJsonRecord> {
    return withMappedErrors(() =>
      db.resumeJson.update({
        where: { id: resumeId },
        data: { content },
        select: resumeJsonSelect,
      }),
    );
  },
};
