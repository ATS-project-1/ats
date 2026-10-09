import { Router } from 'express';
import { requireAuth } from '../common/http/require-auth';
import { requireRole } from '../common/http/require-role';
import { validateBody } from '../common/http/validate';
import { applicationController } from './application.controller';
import { applyForJobSchema } from './application.schemas';

export const applicationRouter = Router();

applicationRouter.post(
  '/',
  requireAuth,
  requireRole('CANDIDATE'),
  validateBody(applyForJobSchema),
  applicationController.apply,
);
