import { Router } from 'express';
import { register, login } from './auth.controller';
import { getMyProfile, updateMyProfile } from './profile.controller';
import { createOrganization } from './organization.controller';
import { requireAuth, requireRole } from '../common/auth.middleware';
import { UserRole } from '@prisma/client';

const router = Router();

// Auth Endpoints (TICKET-101, TICKET-102)
router.post('/auth/register', register);
router.post('/auth/login', login);

// Profile Endpoints (TICKET-104)
router.get('/profiles/me', requireAuth, getMyProfile);
router.patch('/profiles/me', requireAuth, updateMyProfile);

// Organization Endpoints (TICKET-105)
router.post('/organizations', requireAuth, requireRole(UserRole.RECRUITER, UserRole.ADMIN), createOrganization);

export default router;