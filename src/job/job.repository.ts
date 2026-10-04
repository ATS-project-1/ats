import { prisma } from '../common/database/prisma';
import { JobPosting, Prisma } from '@prisma/client';

export class JobRepository {
  async findById(id: string): Promise<JobPosting | null> {
    return prisma.jobPosting.findUnique({
      where: { id },
      include: {
        organization: true,
        applications: {
          select: {
            id: true,
            status: true,
            appliedAt: true,
          },
        },
      },
    });
  }

  async create(data: Prisma.JobPostingCreateInput): Promise<JobPosting> {
    return prisma.jobPosting.create({
      data,
    });
  }
}

export const jobRepository = new JobRepository();