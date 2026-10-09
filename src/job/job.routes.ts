import { Router } from 'express';
import {
  createJobPosting,
  listJobPostings,
  getJobPostingById,
  updateJobPosting,
} from './job.controller';
import { requireAuth, requireRole } from '../common/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.get('/job-postings', listJobPostings);
router.get('/job-postings/:id', getJobPostingById);
router.post('/job-postings', requireAuth, requireRole(UserRole.RECRUITER, UserRole.ADMIN), createJobPosting);
router.patch('/job-postings/:id', requireAuth, requireRole(UserRole.RECRUITER, UserRole.ADMIN), updateJobPosting);

export default router;