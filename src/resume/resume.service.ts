import { resumeRepository } from './resume.repository';
import { Prisma } from '@prisma/client';

export const resumeService = {
  async getResumeById(id: string) {
    return resumeRepository.findById(id);
  },

  async getResumesByCandidate(candidateId: string) {
    return resumeRepository.findByCandidate(candidateId);
  },

  async createResume(data: Prisma.ResumeCreateInput) {
    return resumeRepository.create(data);
  },

  async updateResume(id: string, data: Prisma.ResumeUpdateInput) {
    return resumeRepository.update(id, data);
  },

  async deleteResume(id: string) {
    return resumeRepository.delete(id);
  },

  async addResumeVersion(data: Prisma.ResumeVersionCreateInput) {
    return resumeRepository.addVersion(data);
  },

  async getResumeVersionById(id: string) {
    return resumeRepository.findVersionById(id);
  },
};
