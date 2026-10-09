import { Router } from 'express';
import {
  createResume,
  listMyResumes,
  updateResume,
  createResumeVersion,
  generateResumePdf,
} from './resume.controller';
import { requireAuth, requireRole } from '../common/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

router.post('/resumes', requireAuth, requireRole(UserRole.CANDIDATE), createResume);
router.get('/resumes', requireAuth, listMyResumes);
router.patch('/resumes/:id', requireAuth, requireRole(UserRole.CANDIDATE), updateResume);
router.post('/resumes/:id/versions', requireAuth, requireRole(UserRole.CANDIDATE), createResumeVersion);
router.post('/resumes/versions/:versionId/pdf', requireAuth, generateResumePdf);

export default router;