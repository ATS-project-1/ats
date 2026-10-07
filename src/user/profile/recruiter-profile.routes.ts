import { Router } from 'express';
import { requireAuth } from '../../common/http/require-auth';
import { requireRole } from '../../common/http/require-role';
import { validateBody } from '../../common/http/validate';
import { profileController } from './profile.controller';
import { updateRecruiterProfileSchema } from './profile.schemas';

// Same rule as the candidate router: "/me" routes only, never an id from the URL or body, so a
// recruiter can only ever reach their own profile (no IDOR).
export const recruiterProfileRouter = Router();

const guard = [requireAuth, requireRole('RECRUITER')];

recruiterProfileRouter.get('/me/profile', ...guard, profileController.getRecruiter);
recruiterProfileRouter.patch(
  '/me/profile',
  ...guard,
  validateBody(updateRecruiterProfileSchema),
  profileController.updateRecruiter,
);
