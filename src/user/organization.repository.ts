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

export type OrganizationRecord = Prisma.OrganizationGetPayload<{
  select: typeof organizationSelect;
}>;

export interface CreateOrganizationInput {
  name: string;
  description?: string | null;
  website?: string | null;
}

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
};
