import { Router } from 'express';
import { requireAuth } from '../common/http/require-auth';
import { requireRole } from '../common/http/require-role';
import { validateBody } from '../common/http/validate';
import { jobPostingController } from './job-posting.controller';
import {
  createJobPostingSchema,
  updateJobPostingSchema,
} from './job-posting.schemas';

export const jobPostingRouter = Router();

const recruiterGuard = [requireAuth, requireRole('RECRUITER', 'ADMIN')];

jobPostingRouter.post(
  '/',
  ...recruiterGuard,
  validateBody(createJobPostingSchema),
  jobPostingController.create,
);
jobPostingRouter.patch(
  '/:id',
  ...recruiterGuard,
  validateBody(updateJobPostingSchema),
  jobPostingController.update,
);
jobPostingRouter.get('/', requireAuth, jobPostingController.getAll);
