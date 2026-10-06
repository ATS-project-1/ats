import { applicationRepository } from './application.repository';
import { AppStatus, Prisma } from '@prisma/client';

export const applicationService = {
  async getApplicationById(id: string) {
    return applicationRepository.findById(id);
  },

  async getApplicationByJobAndCandidate(jobId: string, candidateId: string) {
    return applicationRepository.findByJobAndCandidate(jobId, candidateId);
  },

  async getAllApplications() {
    return applicationRepository.findAll();
  },

  async getApplicationsByCandidate(candidateId: string) {
    return applicationRepository.findByCandidate(candidateId);
  },

  async getApplicationsByJob(jobId: string) {
    return applicationRepository.findByJob(jobId);
  },

  async createApplication(data: Prisma.ApplicationCreateInput) {
    return applicationRepository.create(data);
  },

  async updateApplication(id: string, data: Prisma.ApplicationUpdateInput) {
    return applicationRepository.update(id, data);
  },

  async updateApplicationStatus(id: string, status: AppStatus) {
    return applicationRepository.updateStatus(id, status);
  },

  async deleteApplication(id: string) {
    return applicationRepository.delete(id);
  },
};
