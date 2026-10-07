import type { Prisma } from '@prisma/client';
import { prisma, type DbClient } from '../common/db';
import { isUuid } from '../common/ids';
import { withMappedErrors } from '../common/prisma-errors';

const recruiterProfileSelect = {
  id: true,
  jobTitle: true,
  isOrgAdmin: true,
  organization: { select: { id: true, name: true } },
  user: { select: { id: true, email: true, fullName: true } },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.RecruiterProfileSelect;

export type RecruiterProfileRecord = Prisma.RecruiterProfileGetPayload<{
  select: typeof recruiterProfileSelect;
}>;

const recruiterLookupSelect = {
  id: true,
  organizationId: true,
  user: { select: { id: true, role: true } },
} satisfies Prisma.RecruiterProfileSelect;

export type RecruiterLookupRecord = Prisma.RecruiterProfileGetPayload<{
  select: typeof recruiterLookupSelect;
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

  /**
   * Compare-and-set: assigns the profile to an organization only if it has none. The check
   * "not already in an org" and the write happen in one atomic statement, so two concurrent
   * requests can't both succeed. Returns true if exactly one row was updated.
   */
  async assignToOrganizationIfUnassigned(
    profileId: string,
    organizationId: string,
    isOrgAdmin: boolean,
    db: DbClient = prisma,
  ): Promise<boolean> {
    const { count } = await withMappedErrors(() =>
      db.recruiterProfile.updateMany({
        where: { id: profileId, organizationId: null },
        data: { organizationId, isOrgAdmin },
      }),
    );
    return count === 1;
  },

  /** Finds the recruiter profile of the user with this email, or null if there is none. */
  findByUserEmail(email: string, db: DbClient = prisma): Promise<RecruiterLookupRecord | null> {
    return withMappedErrors(() =>
      db.recruiterProfile.findFirst({
        where: { user: { email: email.trim().toLowerCase() } },
        select: recruiterLookupSelect,
      }),
    );
  },
};
