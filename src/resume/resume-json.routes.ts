import { Router } from 'express';
import { requireAuth } from '../common/http/require-auth';
import { requireRole } from '../common/http/require-role';
import { resumeJsonController } from './resume-json.controller';
import { resumeController } from './resume.controller';

export const resumeJsonRouter = Router();

/** All resume endpoints are restricted to CANDIDATE role. */
const candidateGuard = [requireAuth, requireRole('CANDIDATE')];

// POST /resumes — create a resume (one per candidate)
resumeJsonRouter.post(
  '/',
  ...candidateGuard,
  resumeController.create,
);

// GET /resumes — fetch the authenticated candidate's resume
resumeJsonRouter.get('/', ...candidateGuard, resumeJsonController.get);

// PATCH /resumes/:id — replace the content of an existing resume
resumeJsonRouter.patch(
  '/:id',
  ...candidateGuard,
  resumeController.update,
);

// POST /resumes/:id/versions — snapshot a structured resume owned by the candidate.
resumeJsonRouter.post('/:id/versions', ...candidateGuard, resumeController.createVersion);

resumeJsonRouter.post(
  '/versions/:versionId/pdf',
  ...candidateGuard,
  resumeController.downloadPdf,
);
