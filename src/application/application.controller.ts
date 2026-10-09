import type { Request, Response } from 'express';
import { ConflictError } from '../common/errors';
import { getAuth } from '../common/http/get-auth';
import type { ApplyForJobInput } from './application.schemas';
import { applicationService } from './application.service';

export const applicationController = {
  async apply(req: Request, res: Response): Promise<void> {
    try {
      const auth = getAuth(req);
      const input = req.body as ApplyForJobInput;
      const application = await applicationService.applyForJob(
        auth.userId,
        input.jobPostingId,
        input.resumeVersionId,
      );
      res.status(201).json({ application });
    } catch (error) {
      if (error instanceof ConflictError && error.code === 'Duplicate_Application') {
        res.status(409).json({ error: 'You have already applied for this job.' });
        return;
      }
      throw error;
    }
  },
};
