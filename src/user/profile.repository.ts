import { Prisma } from '@prisma/client';
import prisma from '../common/prisma';

export type ProfileData = Partial<
  Pick<Prisma.ProfileCreateInput, 'firstName' | 'lastName' | 'headline' | 'bio'>
>;

export const profileRepository = {
  async getProfileByUserId(userId: string) {
    return prisma.profile.findUnique({
      where: { userId },
    });
  },

  async upsertProfile(userId: string, data: ProfileData) {
    return prisma.profile.upsert({
      where: { userId },
      update: data,
      create: {
        user: { connect: { id: userId } },
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        headline: data.headline,
        bio: data.bio,
      },
    });
  },
};
