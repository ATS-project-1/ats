import { Router } from 'express';
import { requireAuth } from '../common/http/require-auth';
import { requireRole } from '../common/http/require-role';
import { validateBody } from '../common/http/validate';
import { resumeSchema } from './resume.schema';
import { resumeJsonController } from './resume-json.controller';

export const resumeJsonRouter = Router();

/** All resume endpoints are restricted to CANDIDATE role. */
const candidateGuard = [requireAuth, requireRole('CANDIDATE')];

// POST /resumes — create a resume (one per candidate)
resumeJsonRouter.post(
  '/',
  ...candidateGuard,
  validateBody(resumeSchema),
  resumeJsonController.create,
);

// GET /resumes — fetch the authenticated candidate's resume
resumeJsonRouter.get('/', ...candidateGuard, resumeJsonController.get);

// PATCH /resumes/:id — replace the content of an existing resume
resumeJsonRouter.patch(
  '/:id',
  ...candidateGuard,
  validateBody(resumeSchema.partial()),
  resumeJsonController.update,
);
