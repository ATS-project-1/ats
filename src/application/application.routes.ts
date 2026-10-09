import { Router } from 'express';
import { submitApplication, updateApplicationStatus, listApplicationsForJob } from './application.controller';
import { requireAuth, requireRole } from '../common/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.post('/applications', requireAuth, requireRole(UserRole.CANDIDATE), submitApplication);
router.patch('/applications/:id/status', requireAuth, requireRole(UserRole.RECRUITER, UserRole.ADMIN), updateApplicationStatus);
router.get('/job-postings/:id/applications', requireAuth, requireRole(UserRole.RECRUITER, UserRole.ADMIN), listApplicationsForJob);

export default router;