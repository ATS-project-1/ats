import prisma from '../common/prisma';
import { Prisma } from '@prisma/client';

const jobPostingSelect = {
  id: true,
  title: true,
  description: true,
  requirements: true,
  isActive: true,
  organizationId: true,
  createdAt: true,
  updatedAt: true,
  organization: {
    select: {
      id: true,
      name: true,
      description: true,
      website: true,
    },
  },
} satisfies Prisma.JobPostingSelect;

export const jobRepository = {
  async findById(id: string) {
    return prisma.jobPosting.findUnique({
      where: { id },
      select: jobPostingSelect,
    });
  },

  async findAll(onlyActive = false) {
    return prisma.jobPosting.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      select: jobPostingSelect,
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(data: Prisma.JobPostingCreateInput) {
    return prisma.jobPosting.create({
      data,
      select: jobPostingSelect,
    });
  },

  async update(id: string, data: Prisma.JobPostingUpdateInput) {
    return prisma.jobPosting.update({
      where: { id },
      data,
      select: jobPostingSelect,
    });
  },

  async delete(id: string) {
    return prisma.jobPosting.delete({
      where: { id },
      select: { id: true, title: true },
    });
  },
};
