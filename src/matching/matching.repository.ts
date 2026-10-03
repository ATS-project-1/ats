import prisma from '../common/prisma';
import { Prisma } from '@prisma/client';

const matchResultSelect = {
  id: true,
  applicationId: true,
  score: true,
  feedback: true,
  createdAt: true,
  updatedAt: true,
  application: {
    select: {
      id: true,
      status: true,
      jobId: true,
      candidateId: true,
      job: {
        select: { id: true, title: true },
      },
      candidate: {
        select: {
          id: true,
          email: true,
          // passwordHash deliberately excluded
          profile: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
  },
} satisfies Prisma.MatchResultSelect;

export const matchingRepository = {
  async findById(id: string) {
    return prisma.matchResult.findUnique({
      where: { id },
      select: matchResultSelect,
    });
  },

  async findByApplication(applicationId: string) {
    return prisma.matchResult.findUnique({
      where: { applicationId },
      select: matchResultSelect,
    });
  },

  async findAll() {
    return prisma.matchResult.findMany({
      select: matchResultSelect,
      orderBy: { score: 'desc' },
    });
  },

  async create(data: Prisma.MatchResultCreateInput) {
    return prisma.matchResult.create({
      data,
      select: matchResultSelect,
    });
  },

  async update(id: string, data: Prisma.MatchResultUpdateInput) {
    return prisma.matchResult.update({
      where: { id },
      data,
      select: matchResultSelect,
    });
  },

  async delete(id: string) {
    return prisma.matchResult.delete({
      where: { id },
      select: { id: true, applicationId: true, score: true },
    });
  },
};
