import type { Request, Response } from 'express';
import { getAuth } from '../../common/http/get-auth';
import type { UpdateCandidateProfileInput, UpdateRecruiterProfileInput } from './profile.schemas';
import { profileService } from './profile.service';

export const profileController = {
  async getCandidate(req: Request, res: Response): Promise<void> {
    const profile = await profileService.getOrCreateCandidateProfile(getAuth(req).userId);
    res.status(200).json({ profile });
  },

  async updateCandidate(req: Request, res: Response): Promise<void> {
    const profile = await profileService.updateCandidateProfile(
      getAuth(req).userId,
      req.body as UpdateCandidateProfileInput,
    );
    res.status(200).json({ profile });
  },

  async getRecruiter(req: Request, res: Response): Promise<void> {
    const profile = await profileService.getOrCreateRecruiterProfile(getAuth(req).userId);
    res.status(200).json({ profile });
  },

  async updateRecruiter(req: Request, res: Response): Promise<void> {
    const profile = await profileService.updateRecruiterProfile(
      getAuth(req).userId,
      req.body as UpdateRecruiterProfileInput,
    );
    res.status(200).json({ profile });
  },
};
