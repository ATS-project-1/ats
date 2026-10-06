import { Request, Response } from 'express';
import { ProfileData } from './profile.repository';
import { profileService } from './profile.service';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isOptionalText(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isNullableText(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === 'string';
}

export const profileController = {
  async getProfile(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const existingProfile = await profileService.getProfile(userId);
      const profile =
        existingProfile ??
        (await profileService.upsertProfile(userId, {
          firstName: 'Unknown',
          lastName: '',
        }));

      return res.status(200).json(profile);
    } catch (error) {
      console.error('Failed to get profile:', error);
      return res.status(500).json({ error: 'Unable to get profile' });
    }
  },

  async updateProfile(req: Request, res: Response) {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!isObject(req.body)) {
      return res.status(400).json({ error: 'Invalid profile data' });
    }

    const { firstName, lastName, headline, bio } = req.body;
    if (
      !isOptionalText(firstName) ||
      !isOptionalText(lastName) ||
      !isNullableText(headline) ||
      !isNullableText(bio)
    ) {
      return res.status(400).json({ error: 'Invalid profile data' });
    }

    const data: ProfileData = { firstName, lastName, headline, bio };

    try {
      const profile = await profileService.upsertProfile(userId, data);
      return res.status(200).json(profile);
    } catch (error) {
      console.error('Failed to update profile:', error);
      return res.status(500).json({ error: 'Unable to update profile' });
    }
  },
};
