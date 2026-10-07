import type { Prisma } from '@prisma/client';
import { prisma, type DbClient } from '../common/db';
import { isUuid } from '../common/ids';
import { withMappedErrors } from '../common/prisma-errors';

const candidateProfileSelect = {
  id: true,
  headline: true,
  location: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, email: true, fullName: true } },
} satisfies Prisma.CandidateProfileSelect;

export type CandidateProfileRecord = Prisma.CandidateProfileGetPayload<{
  select: typeof candidateProfileSelect;
}>;

export interface CandidateProfileData {
  headline?: string | null;
  location?: string | null;
  phone?: string | null;
}

export const candidateProfileRepository = {
  async findByUserId(
    userId: string,
    db: DbClient = prisma,
  ): Promise<CandidateProfileRecord | null> {
    if (!isUuid(userId)) return null;
    return withMappedErrors(() =>
      db.candidateProfile.findUnique({ where: { userId }, select: candidateProfileSelect }),
    );
  },

  create(
    userId: string,
    data: CandidateProfileData = {},
    db: DbClient = prisma,
  ): Promise<CandidateProfileRecord> {
    return withMappedErrors(() =>
      db.candidateProfile.create({ data: { ...data, userId }, select: candidateProfileSelect }),
    );
  },

  update(
    id: string,
    data: CandidateProfileData,
    db: DbClient = prisma,
  ): Promise<CandidateProfileRecord> {
    return withMappedErrors(() =>
      db.candidateProfile.update({ where: { id }, data, select: candidateProfileSelect }),
    );
  },
};
