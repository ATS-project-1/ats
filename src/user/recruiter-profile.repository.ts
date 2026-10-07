import type { Prisma } from '@prisma/client';
import { prisma, type DbClient } from '../common/db';
import { isUuid } from '../common/ids';
import { withMappedErrors } from '../common/prisma-errors';

const recruiterProfileSelect = {
  id: true,
  userId: true,
  organizationId: true,
  isOrgAdmin: true,
  jobTitle: true,
  organization: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RecruiterProfileSelect;

export type RecruiterProfileRecord = Prisma.RecruiterProfileGetPayload<{
  select: typeof recruiterProfileSelect;
}>;

export interface RecruiterProfileData {
  jobTitle?: string | null;
  isOrgAdmin?: boolean;
}

export const recruiterProfileRepository = {
  async findByUserId(
    userId: string,
    db: DbClient = prisma,
  ): Promise<RecruiterProfileRecord | null> {
    if (!isUuid(userId)) return null;
    return withMappedErrors(() =>
      db.recruiterProfile.findUnique({ where: { userId }, select: recruiterProfileSelect }),
    );
  },

  create(
    userId: string,
    data: RecruiterProfileData = {},
    db: DbClient = prisma,
  ): Promise<RecruiterProfileRecord> {
    return withMappedErrors(() =>
      db.recruiterProfile.create({ data: { ...data, userId }, select: recruiterProfileSelect }),
    );
  },

  update(
    id: string,
    data: RecruiterProfileData,
    db: DbClient = prisma,
  ): Promise<RecruiterProfileRecord> {
    return withMappedErrors(() =>
      db.recruiterProfile.update({ where: { id }, data, select: recruiterProfileSelect }),
    );
  },

  assignToOrganization(
    profileId: string,
    organizationId: string,
    isOrgAdmin: boolean,
    db: DbClient = prisma,
  ): Promise<RecruiterProfileRecord> {
    return withMappedErrors(() =>
      db.recruiterProfile.update({
        where: { id: profileId },
        data: { organizationId, isOrgAdmin },
        select: recruiterProfileSelect,
      }),
    );
  },
};
