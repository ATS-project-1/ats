import { Prisma } from '@prisma/client';
import prisma from '../common/prisma';

export type OrganizationData = {
  name: string;
  description?: string;
  website?: string;
};

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

export const organizationRepository = {
  async createOrganization(
    data: OrganizationData,
    database: DatabaseClient = prisma,
  ) {
    return database.organization.create({ data });
  },

  async linkUserToOrganization(
    userId: string,
    organizationId: string,
    database: DatabaseClient = prisma,
  ) {
    return database.user.update({
      where: { id: userId },
      data: { organizationId },
    });
  },

  async createOrganizationWithAdmin(
    userId: string,
    orgData: OrganizationData,
  ) {
    return prisma.$transaction(async (transaction) => {
      const organization = await transaction.organization.create({
        data: orgData,
      });
      const user = await transaction.user.update({
        where: { id: userId },
        data: {
          organizationId: organization.id,
          role: 'ADMIN',
        },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          organizationId: true,
        },
      });

      return { organization, user };
    });
  },
};
