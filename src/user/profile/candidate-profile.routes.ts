import { Router } from 'express';
import { requireAuth } from '../../common/http/require-auth';
import { requireRole } from '../../common/http/require-role';
import { validateBody } from '../../common/http/validate';
import { profileController } from './profile.controller';
import { updateCandidateProfileSchema } from './profile.schemas';

// Every route acts on the CURRENT user's own profile, identified by the token's userId. No route
// takes a profile id or user id from the URL or body, so ownership is structural: a user can't
// even request someone else's profile. That rules out IDOR (insecure direct object reference)
// bugs, where changing an id in a URL exposes another user's data.
export const candidateProfileRouter = Router();

const guard = [requireAuth, requireRole('CANDIDATE')];

candidateProfileRouter.get('/me/profile', ...guard, profileController.getCandidate);
candidateProfileRouter.patch(
  '/me/profile',
  ...guard,
  validateBody(updateCandidateProfileSchema),
  profileController.updateCandidate,
);
