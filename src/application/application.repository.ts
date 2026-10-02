import prisma from '../common/prisma';
import { AppStatus, Prisma } from '@prisma/client';

// Candidate sub-select reused across application queries — passwordHash excluded
const safeCandidateSelect = {
  id: true,
  email: true,
  role: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      headline: true,
    },
  },
} satisfies Prisma.UserSelect;

const applicationSelect = {
  id: true,
  jobId: true,
  candidateId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  job: {
    select: {
      id: true,
      title: true,
      isActive: true,
      organization: {
        select: { id: true, name: true },
      },
    },
  },
  candidate: {
    select: safeCandidateSelect,
  },
  matchResult: {
    select: {
      id: true,
      score: true,
      feedback: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ApplicationSelect;

export const applicationRepository = {
  async findById(id: string) {
    return prisma.application.findUnique({
      where: { id },
      select: applicationSelect,
    });
  },

  async findByJobAndCandidate(jobId: string, candidateId: string) {
    return prisma.application.findUnique({
      where: { jobId_candidateId: { jobId, candidateId } },
      select: applicationSelect,
    });
  },

  async findAll() {
    return prisma.application.findMany({
      select: applicationSelect,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByCandidate(candidateId: string) {
    return prisma.application.findMany({
      where: { candidateId },
      select: applicationSelect,
      orderBy: { createdAt: 'desc' },
    });
  },

  async findByJob(jobId: string) {
    return prisma.application.findMany({
      where: { jobId },
      select: applicationSelect,
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(data: Prisma.ApplicationCreateInput) {
    return prisma.application.create({
      data,
      select: applicationSelect,
    });
  },

  async update(id: string, data: Prisma.ApplicationUpdateInput) {
    return prisma.application.update({
      where: { id },
      data,
      select: applicationSelect,
    });
  },

  async updateStatus(id: string, status: AppStatus) {
    return prisma.application.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });
  },

  async delete(id: string) {
    return prisma.application.delete({
      where: { id },
      select: { id: true, jobId: true, candidateId: true },
    });
  },
};
