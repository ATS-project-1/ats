import type { Request, Response } from 'express';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../common/errors';
import { getAuth } from '../common/http/get-auth';
import type {
  ApplyForJobInput,
  UpdateApplicationStatusInput,
} from './application.schemas';
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

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const applicationId = req.params.id;
      if (!applicationId || Array.isArray(applicationId)) {
        throw new ValidationError('A single application ID is required', 'INVALID_APPLICATION_ID');
      }
      const input = req.body as UpdateApplicationStatusInput;
      const application = await applicationService.updateApplicationStatus(
        applicationId,
        input.status,
        getAuth(req).userId,
      );
      res.status(200).json({ application });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({
          error: { code: error.code, message: error.message },
        });
        return;
      }
      if (error instanceof ForbiddenError) {
        res.status(403).json({
          error: { code: error.code, message: error.message },
        });
        return;
      }
      if (error instanceof ValidationError && error.code === 'Invalid_State_Transition') {
        res.status(400).json({
          error: { code: error.code, message: error.message },
        });
        return;
      }
      throw error;
    }
  },
};
