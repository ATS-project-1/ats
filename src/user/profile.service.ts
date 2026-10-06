import { ProfileData, profileRepository } from './profile.repository';

export const profileService = {
  async getProfile(userId: string) {
    return profileRepository.getProfileByUserId(userId);
  },

  async upsertProfile(userId: string, data: ProfileData) {
    return profileRepository.upsertProfile(userId, data);
  },
};
