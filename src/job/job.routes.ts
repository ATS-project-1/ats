import { Router } from 'express';
import { requireAuth, requireRole } from '../common/middleware';
import { jobController } from './job.controller';

const jobRoutes = Router();

jobRoutes.post(
  '/',
  requireAuth,
  requireRole(['RECRUITER', 'ADMIN']),
  jobController.createJob,
);

export default jobRoutes;
