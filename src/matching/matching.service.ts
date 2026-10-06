import { matchingRepository } from './matching.repository';
import { Prisma } from '@prisma/client';

export const matchingService = {
  async getMatchResultById(id: string) {
    return matchingRepository.findById(id);
  },

  async getMatchResultByApplication(applicationId: string) {
    return matchingRepository.findByApplication(applicationId);
  },

  async getAllMatchResults() {
    return matchingRepository.findAll();
  },

  async createMatchResult(data: Prisma.MatchResultCreateInput) {
    return matchingRepository.create(data);
  },

  async updateMatchResult(id: string, data: Prisma.MatchResultUpdateInput) {
    return matchingRepository.update(id, data);
  },

  async deleteMatchResult(id: string) {
    return matchingRepository.delete(id);
  },
};
