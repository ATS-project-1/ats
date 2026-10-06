import { Router } from 'express';
import { requireAuth } from '../common/middleware';
import { organizationController } from './organization.controller';

const organizationRoutes = Router();

organizationRoutes.post(
  '/',
  requireAuth,
  organizationController.createOrganization,
);

export default organizationRoutes;
