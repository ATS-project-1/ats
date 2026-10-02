import { jobRepository } from './job.repository';
import { Prisma } from '@prisma/client';

export const jobService = {
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
