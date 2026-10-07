import type { Prisma } from '@prisma/client';
import { prisma, type DbClient } from '../common/db';
import { isUuid } from '../common/ids';
import { withMappedErrors } from '../common/prisma-errors';

const organizationSelect = {
  id: true,
  name: true,
  description: true,
  website: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OrganizationSelect;

const organizationWithMembersSelect = {
  ...organizationSelect,
  recruiters: {
    select: {
      id: true,
      jobTitle: true,
      isOrgAdmin: true,
      user: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
} satisfies Prisma.OrganizationSelect;

export type OrganizationRecord = Prisma.OrganizationGetPayload<{
  select: typeof organizationSelect;
}>;
export type OrganizationWithMembersRecord = Prisma.OrganizationGetPayload<{
  select: typeof organizationWithMembersSelect;
}>;

export interface CreateOrganizationInput {
  name: string;
  description?: string | null;
  website?: string | null;
}

export type UpdateOrganizationInput = Partial<CreateOrganizationInput>;

export const organizationRepository = {
  create(input: CreateOrganizationInput, db: DbClient = prisma): Promise<OrganizationRecord> {
    return withMappedErrors(() =>
      db.organization.create({ data: input, select: organizationSelect }),
    );
  },

  async findById(id: string, db: DbClient = prisma): Promise<OrganizationRecord | null> {
    if (!isUuid(id)) return null;
    return withMappedErrors(() =>
      db.organization.findUnique({ where: { id }, select: organizationSelect }),
    );
  },

  update(
    id: string,
    data: UpdateOrganizationInput,
    db: DbClient = prisma,
  ): Promise<OrganizationWithMembersRecord> {
    return withMappedErrors(() =>
      db.organization.update({ where: { id }, data, select: organizationWithMembersSelect }),
    );
  },

  async findByIdWithMembers(
    id: string,
    db: DbClient = prisma,
  ): Promise<OrganizationWithMembersRecord | null> {
    if (!isUuid(id)) return null;
    return withMappedErrors(() =>
      db.organization.findUnique({ where: { id }, select: organizationWithMembersSelect }),
    );
  },
};
