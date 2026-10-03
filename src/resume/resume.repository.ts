import prisma from '../common/prisma';
import { Prisma } from '@prisma/client';

const resumeVersionSelect = {
  id: true,
  resumeId: true,
  fileUrl: true,
  parsedData: true,
  createdAt: true,
} satisfies Prisma.ResumeVersionSelect;

const resumeSelect = {
  id: true,
  candidateId: true,
  createdAt: true,
  updatedAt: true,
  versions: {
    select: resumeVersionSelect,
    orderBy: { createdAt: 'desc' as const },
  },
} satisfies Prisma.ResumeSelect;

export const resumeRepository = {
  async findById(id: string) {
    return prisma.resume.findUnique({
      where: { id },
      select: resumeSelect,
    });
  },

  async findByCandidate(candidateId: string) {
    return prisma.resume.findMany({
      where: { candidateId },
      select: resumeSelect,
      orderBy: { updatedAt: 'desc' },
    });
  },

  async create(data: Prisma.ResumeCreateInput) {
    return prisma.resume.create({
      data,
      select: resumeSelect,
    });
  },

  async update(id: string, data: Prisma.ResumeUpdateInput) {
    return prisma.resume.update({
      where: { id },
      data,
      select: resumeSelect,
    });
  },

  async delete(id: string) {
    return prisma.resume.delete({
      where: { id },
      select: { id: true, candidateId: true },
    });
  },

  async addVersion(data: Prisma.ResumeVersionCreateInput) {
    return prisma.resumeVersion.create({
      data,
      select: resumeVersionSelect,
    });
  },

  async findVersionById(id: string) {
    return prisma.resumeVersion.findUnique({
      where: { id },
      select: resumeVersionSelect,
    });
  },
};
