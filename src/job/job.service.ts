import { jobRepository } from './job.repository';
import { Prisma } from '@prisma/client';
import { userRepository } from '../user/user.repository';

export const jobService = {
  async createJobPosting(
    userId: string,
    jobData: Pick<
      Prisma.JobPostingCreateInput,
      'title' | 'description' | 'requirements' | 'isActive'
    >,
  ) {
    const user = await userRepository.findById(userId);
    if (!user?.organizationId) {
      throw new Error('Unauthorized_Organization');
    }

    return jobRepository.createJob(user.organizationId, jobData);
  },

  async getJobById(id: string) {
    return jobRepository.findById(id);
  },

  async getAllJobs(onlyActive = false) {
    return jobRepository.findAll(onlyActive);
  },

  async createJob(data: Prisma.JobPostingCreateInput) {
    return jobRepository.create(data);
  },

  async updateJob(id: string, data: Prisma.JobPostingUpdateInput) {
    return jobRepository.update(id, data);
  },

  async deleteJob(id: string) {
    return jobRepository.delete(id);
  },
};
