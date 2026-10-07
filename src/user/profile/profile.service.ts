import { ConflictError } from '../../common/errors';
import { candidateProfileRepository } from '../candidate-profile.repository';
import { recruiterProfileRepository } from '../recruiter-profile.repository';
import type { UpdateCandidateProfileInput, UpdateRecruiterProfileInput } from './profile.schemas';

/**
 * Find the profile, creating an empty one on first access.
 *
 * Get-or-create race: two simultaneous first requests can both find nothing and both try to
 * create. The loser hits the unique userId constraint, which the repository maps to
 * ConflictError. That is not a client error, so we catch it, fetch the winner's row and return
 * it. If there is still no profile, the conflict was something else (e.g. a missing user), so
 * the original error is rethrown.
 */
async function getOrCreate<T>(find: () => Promise<T | null>, create: () => Promise<T>): Promise<T> {
  const existing = await find();
  if (existing) return existing;

  try {
    return await create();
  } catch (err) {
    if (err instanceof ConflictError) {
      const winner = await find();
      if (winner) return winner;
    }
    throw err;
  }
}

export const profileService = {
  getOrCreateCandidateProfile(userId: string) {
    return getOrCreate(
      () => candidateProfileRepository.findByUserId(userId),
      () => candidateProfileRepository.create(userId),
    );
  },

  getOrCreateRecruiterProfile(userId: string) {
    return getOrCreate(
      () => recruiterProfileRepository.findByUserId(userId),
      () => recruiterProfileRepository.create(userId),
    );
  },

  async updateCandidateProfile(userId: string, input: UpdateCandidateProfileInput) {
    // A PATCH can be the first access, so make sure the profile exists first.
    const profile = await profileService.getOrCreateCandidateProfile(userId);
    return candidateProfileRepository.update(profile.id, input);
  },

  async updateRecruiterProfile(userId: string, input: UpdateRecruiterProfileInput) {
    const profile = await profileService.getOrCreateRecruiterProfile(userId);
    return recruiterProfileRepository.update(profile.id, input);
  },
};
